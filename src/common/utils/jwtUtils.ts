import type { RoleType } from "#common/types/RoleType.js";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_SECRET_EXPIRATION_TIME = process.env.JWT_ACCESS_EXPIRATION_TIME!;
const REFRESH_SECRET_EXPIRATION_TIME = process.env.JWT_REFRESH_EXPIRATION_TIME!;

export const generateAccessToken = (
  id: number,
  email: string,
  roleId: number,
  roleName: string,
) => {
  return jwt.sign({ id, email, roleId, roleName }, ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: Number(ACCESS_SECRET_EXPIRATION_TIME),
  });
};

export const generateRefreshToken = (email: string) => {
  return jwt.sign({ email }, REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: Number(REFRESH_SECRET_EXPIRATION_TIME),
  });
};
