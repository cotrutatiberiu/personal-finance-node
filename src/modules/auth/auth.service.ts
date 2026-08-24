import bcrypt from "bcrypt";
import type { RegisterInput } from "./auth.schema.js";
import { prisma } from "../../db/client.js";
import { EmailAlreadyUsedError } from "../../common/errors.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export async function register(input: RegisterInput) {
  // const existingUser = await prisma.users.findFirst({
  //   where: { email: input.email },
  // });
  // if (existingUser) throw new EmailAlreadyUsedError(input.email);

  // const hashedPassword = await bcrypt.hash(input.password, 12);
  // const user = await prisma.users.create({
  //   data: {
  //     first_name: input.firstName,
  //     last_name: input.lastName,
  //     email: input.email,
  //     password: hashedPassword,
  //   },
  // });
}
