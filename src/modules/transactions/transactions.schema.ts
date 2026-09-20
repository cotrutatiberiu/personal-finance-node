import { Prisma } from "#generated/prisma/client.js";
import { z } from "zod";

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER = "TRANSFER",
}

export const createTransactionSchema = z.object({
  amount: z
    .string()
    .regex(/^\d{1,15}(\.\d{1,4})?$/, "Invalid amount format")
    .transform((val) => new Prisma.Decimal(val))
    .refine((val) => val.greaterThan(0), "Invalid amount"),
  description: z.string().trim().max(255).optional(),
  type: z.enum(TransactionType),
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  destinationAccountId: z.number().int().positive().optional(),
}).superRefine((val, ctx) => {
  if (val.type === TransactionType.TRANSFER) {
    if (val.destinationAccountId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationAccountId"],
        message: "Destination account is required for transfers",
      });
    } else if (val.destinationAccountId === val.accountId) {
      ctx.addIssue({
        code: "custom",
        path: ["destinationAccountId"],
        message: "Destination account must differ from source account",
      });
    }
  } else if (val.destinationAccountId !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["destinationAccountId"],
      message: "Destination account is only allowed for transfers",
    });
  }
});

export type CreateTransactionRequest = z.infer<typeof createTransactionSchema>;

export const createTransactionHeadersSchema = z.object({
  "idempotency-key": z.uuid().optional(),
});

export type CreateTransactionHeaders = z.infer<
  typeof createTransactionHeadersSchema
>;
