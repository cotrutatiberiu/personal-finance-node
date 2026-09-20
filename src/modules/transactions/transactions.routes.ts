import { requireAuth } from "#common/middleware/auth.js";
import { validate, validateHeaders } from "#common/middleware/validate.js";
import { Router, type Router as ExpressRouter } from "express";
import * as transactionsSchema from "./transactions.schema.js";
import * as transactionsController from "./transactions.controller.js";

const router: ExpressRouter = Router();

router.post(
  "/",
  requireAuth,
  validate(transactionsSchema.createTransactionSchema),
  validateHeaders(transactionsSchema.createTransactionHeadersSchema),
  transactionsController.createTransaction,
);

export default router;
