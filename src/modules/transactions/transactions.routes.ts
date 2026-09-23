import { requireAuth } from "#common/middleware/auth.js";
import {
  validate,
  validateHeaders,
  validateParams,
} from "#common/middleware/validate.js";
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

router.patch(
  "/:id",
  requireAuth,
  validateParams(transactionsSchema.transactionIdParamSchema),
  validate(transactionsSchema.editTransactionSchema),
  transactionsController.editTransaction,
);

export default router;
