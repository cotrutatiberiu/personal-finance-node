import type { UserDetails } from "#common/types/UserDetails.js";
import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userDetails?: UserDetails;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
 
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing or malformed token" });
    return;
  }

  const token = authHeader.split(" ")[1] ?? "";

  try {
    const secret = process.env.JWT_ACCESS_SECRET!;
    const decoded = jwt.verify(token, secret) as UserDetails;

    req.userDetails = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    return;
  }
};
