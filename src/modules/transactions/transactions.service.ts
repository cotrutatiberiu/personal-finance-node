import type { UserDetails } from "#common/types/UserDetails.js";
import * as transactionsSchema from "./transactions.schema.js";
import { prisma } from "#db/client.js";
import { toPaginatedResponse } from "#common/types/PaginatedResponse.js";
import {
  InsufficientFundsError,
  InvalidPayloadError,
  OptimisticLockError,
  ResourceNotFound,
} from "#common/errors.js";
import { Prisma } from "#generated/prisma/client.js";

const debit = (
  tsx: Prisma.TransactionClient,
  userId: number,
  accountId: number,
  amount: Prisma.Decimal,
) =>
  tsx.accounts.updateMany({
    where: {
      id: accountId,
      user_id: userId,
      balance: { gte: amount },
    },
    data: { balance: { decrement: amount } },
  });

const credit = (
  tsx: Prisma.TransactionClient,
  userId: number,
  destinationAccountId: number,
  amount: Prisma.Decimal,
) =>
  tsx.accounts.updateMany({
    where: { id: destinationAccountId, user_id: userId },
    data: { balance: { increment: amount } },
  });

const withdraw = (
  tsx: Prisma.TransactionClient,
  userId: number,
  accountId: number,
  amount: Prisma.Decimal,
) =>
  tsx.accounts.updateMany({
    where: { id: accountId, user_id: userId },
    data: { balance: { decrement: amount } },
  });

// Locks every touched account in id order before any balance changes, so
// operations touching the same accounts queue instead of deadlocking.
async function lockAccounts(
  tsx: Prisma.TransactionClient,
  accountIds: (number | null | undefined)[],
) {
  const ids = [...new Set(accountIds.filter((id) => id != null))];

  await tsx.$queryRaw`SELECT id FROM accounts WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
}

async function assertTagsOwned(userId: number, tagIds: number[] | undefined) {
  if (!tagIds?.length) return;

  const owned = await prisma.tags.count({
    where: { id: { in: tagIds }, user_id: userId },
  });

  if (owned !== tagIds.length) throw new ResourceNotFound("Tag");
}

// Flattens the join rows: transaction_tags: [{ tags: { id, name } }] -> tags: [{ id, name }].
const toDto = ({
  transaction_tags,
  ...transaction
}: transactionsSchema.TransactionWithRelations) => ({
  ...transaction,
  tags: transaction_tags.map((link) => link.tags),
});

// The invariant is "no account ends negative", not "no step dips negative".
async function assertNonNegativeBalances(
  tsx: Prisma.TransactionClient,
  accountIds: (number | null | undefined)[],
) {
  const ids = accountIds.filter((id) => id != null);

  const overdrawn = await tsx.accounts.count({
    where: { id: { in: ids }, balance: { lt: 0 } },
  });

  if (overdrawn) throw new InsufficientFundsError();
}

export async function create(
  userDetails: UserDetails,
  payload: transactionsSchema.CreateTransactionRequest,
  idempotencyKey?: string,
) {
  const findByIdempotencyKey = (key: string) =>
    prisma.transactions.findFirst({
      where: { user_id: userDetails.id, idempotency_key: key },
      include: transactionsSchema.transactionRelations,
    });

  if (idempotencyKey) {
    const existing = await findByIdempotencyKey(idempotencyKey);

    if (existing) return toDto(existing);
  }

  const userExists = await prisma.users.count({
    where: { id: userDetails.id },
  });

  if (!userExists) throw new ResourceNotFound("User");

  const categoryExists = await prisma.categories.count({
    where: { id: payload.categoryId, user_id: userDetails.id },
  });

  if (!categoryExists) throw new ResourceNotFound("Category");

  await assertTagsOwned(userDetails.id, payload.tagIds);

  try {
    return await prisma.$transaction(async (tsx) => {
      if (payload.type === transactionsSchema.TransactionType.INCOME) {
        const { count } = await tsx.accounts.updateMany({
          where: { id: payload.accountId, user_id: userDetails.id },
          data: {
            balance: { increment: payload.amount },
          },
        });

        if (!count) throw new ResourceNotFound("Account");
      } else if (payload.type === transactionsSchema.TransactionType.EXPENSE) {
        const { count } = await tsx.accounts.updateMany({
          where: {
            id: payload.accountId,
            user_id: userDetails.id,
            balance: { gte: payload.amount },
          },
          data: {
            balance: { decrement: payload.amount },
          },
        });

        if (!count) {
          const exists = await tsx.accounts.count({
            where: { id: payload.accountId, user_id: userDetails.id },
          });

          if (!exists) throw new ResourceNotFound("Account");

          throw new InsufficientFundsError();
        }
      } else if (payload.type === transactionsSchema.TransactionType.TRANSFER) {
        const { accountId, destinationAccountId } = payload;

        if (destinationAccountId === undefined)
          throw new InvalidPayloadError("No destination found");

        const accounts = await tsx.accounts.findMany({
          where: {
            id: { in: [accountId, destinationAccountId] },
            user_id: userDetails.id,
          },
          select: { id: true, currency_id: true },
        });

        const source = accounts.find((a) => a.id === accountId);
        const destination = accounts.find((a) => a.id === destinationAccountId);

        if (!source || !destination) throw new ResourceNotFound("Account");

        if (source.currency_id !== destination.currency_id)
          throw new InvalidPayloadError("Accounts must use the same currency");

        // Update the lower account id first so opposite concurrent transfers lock rows in the same order.
        let debited: { count: number };
        let credited: { count: number };

        if (accountId < destinationAccountId) {
          debited = await debit(tsx, userDetails.id, accountId, payload.amount);
          credited = await credit(
            tsx,
            userDetails.id,
            destinationAccountId,
            payload.amount,
          );
        } else {
          credited = await credit(
            tsx,
            userDetails.id,
            destinationAccountId,
            payload.amount,
          );
          debited = await debit(tsx, userDetails.id, accountId, payload.amount);
        }

        if (!credited.count) throw new ResourceNotFound("Account");
        if (!debited.count) throw new InsufficientFundsError();
      }

      const occurredAt = new Date();
      const transaction = await tsx.transactions.create({
        data: {
          amount: payload.amount,
          description: payload.description || null,
          type: payload.type,
          user_id: userDetails.id,
          account_id: payload.accountId,
          category_id: payload.categoryId,
          destination_account_id: payload.destinationAccountId ?? null,
          occurred_at: occurredAt,
          idempotency_key: idempotencyKey ?? null,
          transaction_tags: {
            create: (payload.tagIds ?? []).map((tag_id) => ({ tag_id })),
          },
        },
        include: transactionsSchema.transactionRelations,
      });

      return toDto(transaction);
    });
  } catch (err) {
    // Two requests with the same key both missed the fast path; the unique index on
    // (user_id, idempotency_key) rejected the second insert and rolled back its balance
    // change. Answer the retry with the transaction the first request created.
    if (
      idempotencyKey &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await findByIdempotencyKey(idempotencyKey);

      if (existing) return toDto(existing);
    }

    throw err;
  }
}

export async function edit(
  userDetails: UserDetails,
  transactionId: number,
  payload: transactionsSchema.EditTransactionRequest,
) {
  const userExists = await prisma.users.count({
    where: { id: userDetails.id },
  });

  if (!userExists) throw new ResourceNotFound("User");

  if (payload.categoryId) {
    const categoryExists = await prisma.categories.count({
      where: { id: payload.categoryId, user_id: userDetails.id },
    });

    if (!categoryExists) throw new ResourceNotFound("Category");
  }

  await assertTagsOwned(userDetails.id, payload.tagIds);

  const existingTransaction = await prisma.transactions.findFirst({
    where: {
      id: transactionId,
      user_id: userDetails.id,
    },
  });

  if (!existingTransaction) throw new ResourceNotFound("Transaction");

  const amount = payload.amount ?? existingTransaction.amount;
  const type =
    payload.type ??
    (existingTransaction.type as transactionsSchema.TransactionType);
  const accountId = payload.accountId ?? existingTransaction.account_id;
  // A stored destination is kept only while the transaction stays a transfer.
  const destinationAccountId =
    payload.destinationAccountId ??
    (type === transactionsSchema.TransactionType.TRANSFER
      ? existingTransaction.destination_account_id
      : null);

  if (type === transactionsSchema.TransactionType.TRANSFER) {
    if (destinationAccountId === null)
      throw new InvalidPayloadError(
        "Destination account is required for transfers",
      );

    if (destinationAccountId === accountId)
      throw new InvalidPayloadError(
        "Destination account must differ from source account",
      );
  } else if (destinationAccountId !== null) {
    throw new InvalidPayloadError(
      "Destination account is only allowed for transfers",
    );
  }

  const touchedAccountIds = [
    existingTransaction.account_id,
    existingTransaction.destination_account_id,
    accountId,
    destinationAccountId,
  ];

  const transaction = await prisma.$transaction(async (tsx) => {
    // Same lock order as delete: the transaction row first, then the accounts by id.
    await tsx.$queryRaw`SELECT id FROM transactions WHERE id = ${transactionId} FOR UPDATE`;
    await lockAccounts(tsx, touchedAccountIds);

    await revertTransactionEffect(tsx, existingTransaction);

    if (type === transactionsSchema.TransactionType.INCOME) {
      const { count } = await tsx.accounts.updateMany({
        where: { id: accountId, user_id: userDetails.id },
        data: { balance: { increment: amount } },
      });

      if (!count) throw new ResourceNotFound("Account");
    } else if (type === transactionsSchema.TransactionType.EXPENSE) {
      const { count } = await tsx.accounts.updateMany({
        where: {
          id: accountId,
          user_id: userDetails.id,
          balance: { gte: amount },
        },
        data: { balance: { decrement: amount } },
      });

      if (!count) {
        const exists = await tsx.accounts.count({
          where: { id: accountId, user_id: userDetails.id },
        });

        if (!exists) throw new ResourceNotFound("Account");

        throw new InsufficientFundsError();
      }
    } else if (
      type === transactionsSchema.TransactionType.TRANSFER &&
      destinationAccountId !== null
    ) {
      const destId = destinationAccountId;

      const accounts = await tsx.accounts.findMany({
        where: {
          id: { in: [accountId, destId] },
          user_id: userDetails.id,
        },
        select: { id: true, currency_id: true },
      });

      const source = accounts.find((a) => a.id === accountId);
      const destination = accounts.find((a) => a.id === destId);

      if (!source || !destination) throw new ResourceNotFound("Account");

      if (source.currency_id !== destination.currency_id)
        throw new InvalidPayloadError("Accounts must use the same currency");

      let debited: { count: number };
      let credited: { count: number };

      if (accountId < destId) {
        debited = await debit(tsx, userDetails.id, accountId, amount);
        credited = await credit(tsx, userDetails.id, destId, amount);
      } else {
        credited = await credit(tsx, userDetails.id, destId, amount);
        debited = await debit(tsx, userDetails.id, accountId, amount);
      }

      if (!credited.count) throw new ResourceNotFound("Account");
      if (!debited.count) throw new InsufficientFundsError();
    }

    await assertNonNegativeBalances(tsx, touchedAccountIds);

    const { count: updateCount } = await tsx.transactions.updateMany({
      where: {
        id: transactionId,
        version: existingTransaction.version,
      },
      data: {
        type,
        account_id: accountId,
        amount,
        destination_account_id: destinationAccountId,
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
        ...(payload.categoryId && { category_id: payload.categoryId }),
        updated_at: new Date(),
        version: { increment: 1 },
      },
    });

    if (!updateCount) throw new OptimisticLockError("Transaction");

    // Diff instead of delete-all-and-reinsert: links that stay keep their applied_at.
    const { tagIds } = payload;
    if (tagIds !== undefined) {
      await tsx.transaction_tags.deleteMany({
        where: { transaction_id: transactionId, tag_id: { notIn: tagIds } },
      });

      await tsx.transaction_tags.createMany({
        data: tagIds.map((tag_id) => ({ transaction_id: transactionId, tag_id })),
        skipDuplicates: true, // ON CONFLICT DO NOTHING on the (transaction_id, tag_id) primary key
      });
    }

    return tsx.transactions.findUniqueOrThrow({
      where: { id: transactionId },
      include: transactionsSchema.transactionRelations,
    });
  });

  return toDto(transaction);
}

// Undoes a transaction's balance effect without balance guards: an intermediate
// negative balance is fine, callers check the final state afterwards.
async function revertTransactionEffect(
  tsx: Prisma.TransactionClient,
  existingTransaction: transactionsSchema.Transaction,
) {
  const { type, user_id, account_id, destination_account_id, amount } =
    existingTransaction;

  if (type === transactionsSchema.TransactionType.INCOME) {
    await withdraw(tsx, user_id, account_id, amount);
  } else if (type === transactionsSchema.TransactionType.EXPENSE) {
    await credit(tsx, user_id, account_id, amount);
  } else if (
    type === transactionsSchema.TransactionType.TRANSFER &&
    destination_account_id !== null
  ) {
    await withdraw(tsx, user_id, destination_account_id, amount);
    await credit(tsx, user_id, account_id, amount);
  }
}

export async function getTransactionById(userDetails: UserDetails, id: number) {
  const transaction = await prisma.transactions.findFirst({
    where: { user_id: userDetails.id, id },
    include: transactionsSchema.transactionRelations,
  });

  if (!transaction) throw new ResourceNotFound("Transaction");

  return toDto(transaction);
}

export async function deleteTransactionById(
  userDetails: UserDetails,
  id: number,
) {
  await prisma.$transaction(async (tsx) => {
    let deletedTransaction: transactionsSchema.Transaction;

    try {
      deletedTransaction = await tsx.transactions.delete({
        where: { user_id: userDetails.id, id },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      )
        throw new ResourceNotFound("Transaction");

      throw err;
    }

    const touchedAccountIds = [
      deletedTransaction.account_id,
      deletedTransaction.destination_account_id,
    ];

    await lockAccounts(tsx, touchedAccountIds);
    await revertTransactionEffect(tsx, deletedTransaction);
    // Deleting an income whose money was already spent would overdraw the account.
    await assertNonNegativeBalances(tsx, touchedAccountIds);
  });
}

export async function getTransactions(
  userDetails: UserDetails,
  query: transactionsSchema.GetTransactionsQuery,
) {
  const {
    page,
    pageSize,
    orderBy,
    order,
    from,
    to,
    type,
    accountId,
    categoryId,
    tagId,
    minAmount,
    maxAmount,
  } = query;

  const where: Prisma.transactionsWhereInput = {
    user_id: userDetails.id,
    ...(type && { type }),
    ...(categoryId && { category_id: categoryId }),
    ...(tagId && { transaction_tags: { some: { tag_id: tagId } } }),
    ...(accountId && {
      OR: [{ account_id: accountId }, { destination_account_id: accountId }],
    }),
    ...((from || to) && {
      occurred_at: { ...(from && { gte: from }), ...(to && { lte: to }) },
    }),
    ...((minAmount || maxAmount) && {
      amount: {
        ...(minAmount && { gte: minAmount }),
        ...(maxAmount && { lte: maxAmount }),
      },
    }),
  };

  const [transactions, total] = await prisma.$transaction(
    [
      prisma.transactions.findMany({
        where,
        include: transactionsSchema.transactionRelations,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: [{ [orderBy]: order }, { id: order }],
      }),
      prisma.transactions.count({ where }),
    ],
    // Both queries read from one snapshot taken at the first query, so total always
    // matches the rows even if another request inserts in between. Under the default
    // ReadCommitted each statement would see its own snapshot. Read-only, so no retries.
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );

  return toPaginatedResponse(transactions.map(toDto), total, page, pageSize);
}
