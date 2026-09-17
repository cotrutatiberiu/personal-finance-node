import { type Request, type Response } from "express";
import * as transactionsService from "./transactions.service.js";
import * as transactionsSchema from "./transactions.schema.js";

export async function createTransaction(req: Request, res: Response) {
  const headers =
    req.validatedHeaders as transactionsSchema.CreateTransactionHeaders;

  const transaction = await transactionsService.create(
    req.userDetails!,
    req.body as transactionsSchema.CreateTransactionRequest,
    headers["idempotency-key"],
  );
  res.status(201).json(transaction);
}
