import { Prisma } from "@prisma/client/extension";
const userWithRoles = Prisma.sat usersGetPayload<{
  include: {
    userRoles: {
      include: { role: true };
    };
  };
}>;
