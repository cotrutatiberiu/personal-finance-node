import bcrypt from "bcrypt";
import { prisma } from "#db/client.js";
import { EmailAlreadyUsedError, ResourceNotFound } from "#common/errors.js";
import { RoleType } from "#common/types/RoleType.js";

export async function findUserByEmail(email: string) {
  return prisma.users.findFirst({
    where: { email },
    include: { roles: true },
  });
}

export async function createUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) throw new EmailAlreadyUsedError(data.email);

  const userRole = await prisma.roles.findFirst({
    where: { name: RoleType.USER },
  });
  if (!userRole) throw new ResourceNotFound("Role");

  const hashedPassword = await bcrypt.hash(data.password, 12);

  return await prisma.users.create({
    data: {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      password: hashedPassword,
      role_id: userRole.id,
    },
    include: {
      roles: true,
    },
  });
}
