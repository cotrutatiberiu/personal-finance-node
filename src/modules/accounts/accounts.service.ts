import {
  ConflictError,
  DuplicateResource,
  ResourceNotFound,
} from "#common/errors.js";
import { logger } from "#common/logger.js";
import type { UserDetails } from "#common/types/UserDetails.js";
import { prisma } from "#db/client.js";
import * as accountsMapper from "./accounts.mapper.js";
import * as accountsSchema from "./accounts.schema.js";

export async function create(
  userDetails: UserDetails,
  payload: accountsSchema.CreateAccountRequest,
) {
  const accountExists = await prisma.accounts.count({
    where: { user_id: userDetails.id, name: { equals: payload.name, mode: "insensitive" } },
  });
  if (accountExists) throw new DuplicateResource("Account");

  return await prisma.accounts.create({
    data: {
      user_id: userDetails.id,
      account_type: payload.accountType,
      currency_id: payload.currencyId,
      name: payload.name,
    },
  });
}

export async function getById(userDetails: UserDetails, accountId: number) {
  const account = await prisma.accounts.findFirst({
    where: { user_id: userDetails.id, id: accountId },
  });
  if (!account) throw new ResourceNotFound("Account");

  return accountsMapper.toDto(account);
}

export async function getAccounts(
  userDetails: UserDetails,
  pageSize: number,
  page: number,
  orderBy: "name" | "created_at",
) {
  const accounts = await prisma.accounts.findMany({
    where: { user_id: userDetails.id, archived: false },
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { [orderBy]: "asc" },
  });

  return accounts.map(accountsMapper.toDto);
}

export async function update(
  userDetails: UserDetails,
  accountId: number,
  payload: accountsSchema.UpdateAccountRequest,
) {
  const accountExists = await prisma.accounts.count({
    where: { user_id: userDetails.id, id: accountId },
  });
  if (!accountExists) throw new ResourceNotFound("Account");
  // TODO: convert currency values
  const updatedAccount = await prisma.accounts.update({
    where: { id: accountId },
    data: {
      name: payload.name,
      account_type: payload.accountType,
      currency_id: payload.currencyId,
    },
  });

  logger.info({ accountId, userId: userDetails.id }, "account updated");

  return updatedAccount;
}

export async function archiveById(userDetails: UserDetails, accountId: number) {
  const account = await prisma.accounts.findFirst({
    where: { user_id: userDetails.id, id: accountId },
  });
  if (!account) throw new ResourceNotFound("Account");
  if (account.archived) throw new ResourceNotFound("Account already archived");

  const updatedAccount = await prisma.accounts.update({
    where: { id: accountId },
    data: {
      archived: true,
    },
  });

  logger.info({ accountId, userId: userDetails.id }, "account archived");

  return updatedAccount;
}
