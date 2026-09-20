import type { UserDetails } from "#common/types/UserDetails.js";
import * as transactionsSchema from "./transactions.schema.js";
import { prisma } from "#db/client.js";
import {
  InsufficientFundsError,
  InvalidPayloadError,
  ResourceNotFound,
} from "#common/errors.js";

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

      const debit = () =>
        tsx.accounts.updateMany({
          where: {
            id: accountId,
            user_id: userDetails.id,
            balance: { gte: payload.amount },
          },
          data: { balance: { decrement: payload.amount } },
        });

      const credit = () =>
        tsx.accounts.updateMany({
          where: { id: destinationAccountId, user_id: userDetails.id },
          data: { balance: { increment: payload.amount } },
        });

      // Update the lower account id first so opposite concurrent transfers lock rows in the same order.
      let debited: { count: number };
      let credited: { count: number };

      if (accountId < destinationAccountId) {
        debited = await debit();
        credited = await credit();
      } else {
        credited = await credit();
        debited = await debit();
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
