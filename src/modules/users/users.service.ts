import bcrypt from "bcrypt";
import { prisma } from "#db/client.js";
import { EmailAlreadyUsedError, ResourceNotFound } from "#common/errors.js";
import { RoleType } from "#common/types/RoleType.js";

export async function findUserByEmail(email: string) {
  return prisma.users.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { roles: true },
  });
}

export async function existsUserByEmail(email: string) {
  return prisma.users.count({
    where: { email: { equals: email, mode: "insensitive" } },
  });
}

export async function createUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  const existingUser = await existsUserByEmail(data.email);
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
