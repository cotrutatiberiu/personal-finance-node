import { validate } from "#common/middleware/validate.js";
import { requireAuth } from "#common/middleware/auth.js";
import { Router, type Router as ExpressRouter } from "express";
import * as accountsSchema from "./accounts.schema.js";
import * as accountsController from './accounts.controller.js';

const router: ExpressRouter = Router();

router.post(
  "/",
  requireAuth,
  validate(accountsSchema.createAccountSchema),
  accountsController.createAccount
);

router.patch(
  "/:id",
  requireAuth,
  validate(accountsSchema.updateAccountSchema),
  accountsController.updateAccount
);

export default router;
