import { Prisma } from "../../../generated/prisma/client.js";

export type UserWithRoles = Prisma.usersGetPayload<{
  include: { roles: true };
}>;
