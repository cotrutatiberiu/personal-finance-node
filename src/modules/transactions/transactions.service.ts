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

  if (payload.amount <= 0) throw new InvalidPayloadError("Invalid amount");

  const transaction = await prisma.$transaction(async (tsx) => {
    if (payload.type === transactionsSchema.TransactionType.INCOME) {
      const { count } = await tsx.accounts.updateMany({
        where: { id: payload.accountId, user_id: userDetails.id },
        data: {
          balance: { increment: payload.amount },
        },
      });

      if (!count) throw new ResourceNotFound("Account");
    } else if (
      payload.type === transactionsSchema.TransactionType.EXPENSE ||
      payload.type === transactionsSchema.TransactionType.TRANSFER
    ) {
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
        occurred_at: occurredAt,
        idempotency_key: idempotencyKey ?? null,
      },
    });
  });

  return transaction;
}
