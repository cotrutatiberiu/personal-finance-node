import { Prisma } from "#generated/prisma/client.js";
import { z } from "zod";

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER = "TRANSFER",
}

export const createTransactionSchema = z.object({
  amount: z.number().multipleOf(0.01),
  description: z.string().trim().max(255).optional(),
  type: z.enum(TransactionType),
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive()
});

export type CreateTransactionRequest = z.infer<typeof createTransactionSchema>;

export const createTransactionHeadersSchema = z.object({
  "idempotency-key": z.uuid().optional(),
});

export type CreateTransactionHeaders = z.infer<
  typeof createTransactionHeadersSchema
>;
