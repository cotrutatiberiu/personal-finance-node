import { requireAuth } from "#common/middleware/auth.js";
import { validate, validateParams, validateQuery } from "#common/middleware/validate.js";
import { Router, type Router as ExpressRouter } from "express";
import * as categoriesSchema from "./categories.schema.js";
import * as categoriesController from "./categories.controller.js";

const router: ExpressRouter = Router();

router.post(
  "/",
  requireAuth,
  validate(categoriesSchema.createCategorySchema),
  categoriesController.createAccountSchema,
);

router.get(
  "/search",
  requireAuth,
  validateQuery(categoriesSchema.getCategoriesQuerySchema),
  categoriesController.getCategories,
);

router.get(
  "/:id",
  requireAuth,
  validateParams(categoriesSchema.categoryIdParamSchema),
  categoriesController.getById,
);

export default router;
