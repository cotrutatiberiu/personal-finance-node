import { AccountType } from "#common/types/AccountType.js";
import { includes, z } from "zod";
import { Prisma } from "../../../generated/prisma/client.js";

export const createAccountSchema = z.object({
  accountType: z.enum(AccountType),
  currencyId: z.number(),
  name: z
    .string()
    .min(1, "Account name is required")
    .max(255, "Account name name cannot exceed 50 characters"),
});

export const updateAccountSchema = z.object({
  accountType: z.enum(AccountType),
  currencyId: z.number(),
  name: z
    .string()
    .min(1, "Account name is required")
    .max(255, "Account name name cannot exceed 50 characters"),
});

export const getAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).default(10),
  orderBy: z.enum(["name", "created_at"]).default("created_at"),
});

export type CreateAccountRequest = z.infer<typeof createAccountSchema>;
export type UpdateAccountRequest = z.infer<typeof updateAccountSchema>;
export type Account = Prisma.accountsGetPayload<{}>;
export type GetAccountsQuery = z.infer<typeof getAccountsQuerySchema>;
