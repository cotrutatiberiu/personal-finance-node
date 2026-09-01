import { AccountType } from "#common/types/AccountType.js";
import { z } from "zod";

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
  archived: z.boolean(),
  name: z
    .string()
    .min(1, "Account name is required")
    .max(255, "Account name name cannot exceed 50 characters"),
});

export type CreateAccountRequest = z.infer<typeof createAccountSchema>;
export type UpdateAccountRequest = z.infer<typeof updateAccountSchema>