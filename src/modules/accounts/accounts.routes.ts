import { validate, validateQuery } from "#common/middleware/validate.js";
import { requireAuth } from "#common/middleware/auth.js";
import { Router, type Router as ExpressRouter } from "express";
import * as accountsSchema from "./accounts.schema.js";
import * as accountsController from "./accounts.controller.js";

const router: ExpressRouter = Router();

router.post(
  "/",
  requireAuth,
  validate(accountsSchema.createAccountSchema),
  accountsController.create,
);

router.get(
  "/search",
  requireAuth,
  validateQuery(accountsSchema.getAccountsQuerySchema),
  accountsController.getAccounts,
);

router.get(
  "/:id",
  requireAuth,
  accountsController.getById,
);

router.patch(
  "/:id",
  requireAuth,
  validate(accountsSchema.updateAccountSchema),
  accountsController.updatebyId,
);

router.patch("/:id/archive", requireAuth, accountsController.archiveById);

export default router;
