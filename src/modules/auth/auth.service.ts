import bcrypt from "bcrypt";
import type { RegisterRequest, LoginRequest } from "./auth.schema.js";
import { InvalidCredentialsError } from "#common/errors.js";
import * as usersMapper from "#modules/users/users.mapper.js";
import * as jwtutils from "#common/utils/jwtUtils.js";
import * as usersService from "#modules/users/user.service.js";

export async function register(payload: RegisterRequest) {
  const user = await usersService.createUser(payload);

  return usersMapper.toDto(user);
}

export async function login(payload: LoginRequest) {
  const user = await usersService.findUserByEmail(payload.email);

  if (!user) throw new InvalidCredentialsError();

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) throw new InvalidCredentialsError();

  return {
    accessToken: jwtutils.generateAccessToken(
      user.email,
      user.role_id,
      user.roles.name,
    ),
    refreshToken: jwtutils.generateRefreshToken(user.email),
  };
}
