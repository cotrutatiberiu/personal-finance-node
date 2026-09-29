import { type Request, type Response, type NextFunction } from "express";
import { logger } from "#common/logger.js";
import { AppError } from "../errors.js";
import { Prisma } from "#generated/prisma/client.js";

// Safety net for Prisma errors no call site handled. Call sites can still catch
// these themselves when they need a more specific message.
const prismaErrorStatus: Record<string, { status: number; error: string }> = {
  P2002: { status: 409, error: "Resource already exists" }, // unique constraint
  P2003: { status: 409, error: "Related resource conflict" }, // foreign key
  P2025: { status: 404, error: "Resource not found" }, // record not found
};

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = prismaErrorStatus[err.code];

    if (mapped) {
      logger.warn({ code: err.code, meta: err.meta }, "unhandled prisma error");
      return res.status(mapped.status).json({ error: mapped.error });
    }
  }

  logger.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
