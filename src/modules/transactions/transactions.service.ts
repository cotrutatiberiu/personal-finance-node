import type { UserDetails } from "#common/types/UserDetails.js";
import * as transactionsSchema from "./transactions.schema.js";
import { prisma } from "#db/client.js";
import {
  InsufficientFundsError,
  InvalidPayloadError,
  OptimisticLockError,
  ResourceNotFound
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

export async function create(
  userDetails: UserDetails,
  payload: transactionsSchema.CreateTransactionRequest,
  idempotencyKey?: string,
) {
  if (idempotencyKey) {
    const existing = await prisma.transactions.findFirst({
      where: { user_id: userDetails.id, idempotency_key: idempotencyKey },
    });

    if (existing) return existing;
  }

  const userExists = await prisma.users.count({
    where: { id: userDetails.id },
  });

  if (!userExists) throw new ResourceNotFound("User");

  const categoryExists = await prisma.categories.count({
    where: { id: payload.categoryId, user_id: userDetails.id },
  });

  if (!categoryExists) throw new ResourceNotFound("Category");

  const transaction = await prisma.$transaction(async (tsx) => {
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
    return await tsx.transactions.create({
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
      },
    });
  });

  return transaction;
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

  const existingTransaction = await prisma.transactions.findFirst({
    where: {
      id: transactionId,
      user_id: userDetails.id,
    },
  });

  if (!existingTransaction) throw new ResourceNotFound("Transaction");

  const amount = payload.amount ?? existingTransaction.amount;

  const transaction = await prisma.$transaction(async (tsx) => {
    await revertTransactionEffect(tsx, existingTransaction);

    let destinationAccountId: number | null = null;

    if (payload.type === transactionsSchema.TransactionType.INCOME) {
      const { count } = await tsx.accounts.updateMany({
        where: { id: payload.accountId, user_id: userDetails.id },
        data: { balance: { increment: amount } },
      });

      if (!count) throw new ResourceNotFound("Account");
    } else if (payload.type === transactionsSchema.TransactionType.EXPENSE) {
      const { count } = await tsx.accounts.updateMany({
        where: {
          id: payload.accountId,
          user_id: userDetails.id,
          balance: { gte: amount },
        },
        data: { balance: { decrement: amount } },
      });

      if (!count) {
        const exists = await tsx.accounts.count({
          where: { id: payload.accountId, user_id: userDetails.id },
        });

        if (!exists) throw new ResourceNotFound("Account");

        throw new InsufficientFundsError();
      }
    } else if (payload.type === transactionsSchema.TransactionType.TRANSFER) {
      const { accountId, destinationAccountId: destId } = payload;

      if (destId === undefined)
        throw new InvalidPayloadError("No destination found");

      destinationAccountId = destId;

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

    const { count: updateCount } = await tsx.transactions.updateMany({
      where: {
        id: transactionId,
        version: existingTransaction.version,
      },
      data: {
        type: payload.type,
        account_id: payload.accountId,
        amount,
        destination_account_id: destinationAccountId,
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
        ...(payload.categoryId && { category_id: payload.categoryId }),
        version: { increment: 1 },
      },
    });

    if (!updateCount) throw new OptimisticLockError("Transaction");

    return tsx.transactions.findUniqueOrThrow({
      where: { id: transactionId },
    });
  });

  return transaction;
}

async function revertTransactionEffect(
  tsx: Prisma.TransactionClient,
  existingTransaction: transactionsSchema.Transaction,
) {
  if (existingTransaction.type === transactionsSchema.TransactionType.INCOME) {
    const { count } = await debit(
      tsx,
      existingTransaction.user_id,
      existingTransaction.account_id,
      existingTransaction.amount,
    );

    if (!count) throw new InsufficientFundsError();
  } else if (
    existingTransaction.type === transactionsSchema.TransactionType.EXPENSE
  ) {
    await credit(
      tsx,
      existingTransaction.user_id,
      existingTransaction.account_id,
      existingTransaction.amount,
    );
  } else if (
    existingTransaction.type === transactionsSchema.TransactionType.TRANSFER &&
    existingTransaction.destination_account_id !== null
  ) {
    const { account_id: sourceId, destination_account_id: destId, user_id, amount } =
      existingTransaction;

    let debitResult: { count: number };

    if (destId < sourceId) {
      debitResult = await debit(tsx, user_id, destId, amount);
      await credit(tsx, user_id, sourceId, amount);
    } else {
      await credit(tsx, user_id, sourceId, amount);
      debitResult = await debit(tsx, user_id, destId, amount);
    }

    if (!debitResult.count) throw new InsufficientFundsError();
  }
}
