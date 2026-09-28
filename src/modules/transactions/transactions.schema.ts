import {
  paginationQuerySchema,
  SortOrder,
} from "#common/schemas/pagination.schema.js";
import { Prisma } from "#generated/prisma/client.js";
import { z } from "zod";

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER = "TRANSFER",
}

export enum TransactionOrderBy {
  OCCURRED_AT = "occurred_at",
  UPDATED_AT = "updated_at",
}

const decimalSchema = z
  .string()
  .regex(/^\d{1,15}(\.\d{1,4})?$/, "Invalid amount format")
  .transform((val) => new Prisma.Decimal(val));

const amountSchema = decimalSchema.refine(
  (val) => val.greaterThan(0),
  "Invalid amount",
);

const utcDateSchema = z.iso.datetime().transform((val) => new Date(val));

export const createTransactionSchema = z
  .object({
    amount: amountSchema,
    description: z.string().trim().max(255).optional(),
    type: z.enum(TransactionType),
    accountId: z.number().int().positive(),
    categoryId: z.number().int().positive(),
    destinationAccountId: z.number().int().positive().optional(),
  })
  .superRefine((val, ctx) => {
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

export const editTransactionSchema = z
  .object({
    amount: amountSchema.optional(),
    description: z.string().trim().max(255).optional(),
    type: z.enum(TransactionType),
    accountId: z.number().int().positive(),
    categoryId: z.number().int().positive().optional(),
    destinationAccountId: z.number().int().positive().optional(),
  })
  .superRefine((val, ctx) => {
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

export type EditTransactionRequest = z.infer<typeof editTransactionSchema>;

export const transactionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type TransactionIdParam = z.infer<typeof transactionIdParamSchema>;

export type Transaction = Prisma.transactionsGetPayload<{}>;

const summary = { select: { id: true, name: true } } as const;

export const transactionRelations = {
  accounts: summary,
  destination_account: summary,
  categories: summary,
} satisfies Prisma.transactionsInclude;

export type TransactionWithRelations = Prisma.transactionsGetPayload<{
  include: typeof transactionRelations;
}>;

export const getTransactionsQuerySchema = paginationQuerySchema
  .extend({
    orderBy: z.enum(TransactionOrderBy).default(TransactionOrderBy.OCCURRED_AT),
    order: z.enum(SortOrder).default(SortOrder.DESC),
    from: utcDateSchema.optional(),
    to: utcDateSchema.optional(),
    type: z.enum(TransactionType).optional(),
    accountId: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    minAmount: decimalSchema.optional(),
    maxAmount: decimalSchema.optional(),
  })
  .refine((val) => !val.from || !val.to || val.from <= val.to, {
    path: ["from"],
    message: "'from' must not be after 'to'",
  })
  .refine(
    (val) =>
      !val.minAmount ||
      !val.maxAmount ||
      val.minAmount.lessThanOrEqualTo(val.maxAmount),
    { path: ["minAmount"], message: "'minAmount' must not exceed 'maxAmount'" },
  );

export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;
