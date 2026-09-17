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
  categoriesController.createAccount,
);

router.get(
  "/search",
  requireAuth,
  validateQuery(categoriesSchema.getCategoriesQuerySchema),
  categoriesController.getCategories,
);

router.get("/tree", requireAuth, categoriesController.getTree);

router.get(
  "/:id",
  requireAuth,
  validateParams(categoriesSchema.categoryIdParamSchema),
  categoriesController.getById,
);

router.get(
  "/:id/subcategories",
  requireAuth,
  validateParams(categoriesSchema.categoryIdParamSchema),
  categoriesController.getSubCategories,
);

router.patch(
  "/:id/parent",
  requireAuth,
  validateParams(categoriesSchema.categoryIdParamSchema),
  validate(categoriesSchema.reassignCategoryParentSchema),
  categoriesController.reassignParent,
);

export default router;
