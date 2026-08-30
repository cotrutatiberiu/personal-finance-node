import bcrypt from "bcrypt";
import type { RegisterRequest, LoginRequest } from "./auth.schema.js";
import { prisma } from "../../db/client.js";
import {
  EmailAlreadyUsedError,
  InvalidCredentialsError,
} from "../../common/errors.js";

export async function register(payload: RegisterRequest) {
  const existingUser = await prisma.users.findFirst({
    where: { email: payload.email },
  });
  if (existingUser) throw new EmailAlreadyUsedError(payload.email);

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const user = await prisma.users.create({
    data: {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      password: hashedPassword,
      role_id: payload.roleId,
    },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      created_at: true,
    },
  });

  return user;
}

export async function login(payload: LoginRequest) {
  const user = await prisma.users.findFirst({
    where: { email: payload.email },
    include: {
      roles: true
    },
  });

  if (!user) throw new InvalidCredentialsError();

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) throw new InvalidCredentialsError();

  return toLoginReponse(user);
}
