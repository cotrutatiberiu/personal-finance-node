import bcrypt from "bcrypt";
import type { RegisterRequest, LoginRequest } from "./auth.schema.js";
import { InvalidCredentialsError } from "#common/errors.js";
import * as usersMapper from "#modules/users/users.mapper.js";
import * as jwtutils from "#common/utils/jwtUtils.js";
import * as usersService from "#modules/users/users.service.js";
import { logger } from "#common/logger.js";

export async function register(payload: RegisterRequest) {
  const user = await usersService.createUser(payload);

  logger.info({ userId: user.id }, "user registered");

  return usersMapper.toDto(user);
}

export async function login(payload: LoginRequest) {
  const user = await usersService.findUserByEmail(payload.email);

  if (!user) {
    logger.warn({ email: payload.email }, "login failed: user not found");
    throw new InvalidCredentialsError();
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) {
    logger.warn({ userId: user.id }, "login failed: invalid password");
    throw new InvalidCredentialsError();
  }

  logger.info({ userId: user.id }, "user logged in");

  return {
    accessToken: jwtutils.generateAccessToken(
      user.id,
      user.email,
      user.role_id,
      user.roles.name,
    ),
    refreshToken: jwtutils.generateRefreshToken(user.email),
  };
}
