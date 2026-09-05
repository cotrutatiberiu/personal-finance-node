import type { Account } from "./accounts.schema.js";

export const toDto = (account: Account) => {
  const { archived, ...rest } = account;
  return rest;
};
