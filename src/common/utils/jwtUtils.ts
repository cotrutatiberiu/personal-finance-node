import type { RoleType } from "#common/types/RoleType";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const generateAccessToken = (roleId: number, roleName: RoleType) => {
  return jwt.sign({ roleId, roleName }, ACCESS_SECRET, { algorithm: "RS256" });
};

export const generateRefreshToken = (roleId: number, roleName: RoleType) => {
  return jwt.sign({ roleId, roleName }, REFRESH_SECRET, { algorithm: "RS256" });
};
