import { DuplicateResource, ResourceNotFound } from "#common/errors.js";
import type { UserDetails } from "#common/types/UserDetails.js";
import { prisma } from "#db/client.js";
import type * as accountsSchema from "./accounts.schema.js";

export async function create(
  userDetails: UserDetails,
  payload: accountsSchema.CreateAccountRequest,
) {
  const accountExists = await prisma.accounts.findFirst({
    where: { user_id: userDetails.id, name: payload.name },
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

export async function update(
  userDetails: UserDetails,
  accountId: number,
  payload: accountsSchema.UpdateAccountRequest,
) {
  const accountExists = await prisma.accounts.findFirst({
    where: { user_id: userDetails.id, id: accountId },
  });
  if (!accountExists) throw new ResourceNotFound("Account");
  console.log(payload.archived);
  return await prisma.accounts.update({
    where: { id: accountId },
    data: {
      name: payload.name,
      archived: payload.archived,
      account_type: payload.accountType,
    },
  });
}
