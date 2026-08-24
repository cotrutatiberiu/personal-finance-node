import { type Request, type Response, type NextFunction } from "express";
import { AppError } from "../errors.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  req.log?.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
