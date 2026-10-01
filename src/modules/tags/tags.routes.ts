import { requireAuth } from "#common/middleware/auth.js";
import { validate, validateParams, validateQuery } from "#common/middleware/validate.js";
import { Router, type Router as ExpressRouter } from "express";
import * as tagsSchema from "./tags.schema.js";
import * as tagsController from "./tags.controller.js";

const router: ExpressRouter = Router();

router.post(
  "/",
  requireAuth,
  validate(tagsSchema.createTagSchema),
  tagsController.createTag,
);

router.get(
  "/search",
  requireAuth,
  validateQuery(tagsSchema.getTagsQuerySchema),
  tagsController.getTags,
);

router.get(
  "/:id",
  requireAuth,
  validateParams(tagsSchema.tagIdParamSchema),
  tagsController.getById,
);

router.patch(
  "/:id",
  requireAuth,
  validateParams(tagsSchema.tagIdParamSchema),
  validate(tagsSchema.updateTagSchema),
  tagsController.renameTag,
);

router.delete(
  "/:id",
  requireAuth,
  validateParams(tagsSchema.tagIdParamSchema),
  tagsController.deleteTag,
);

export default router;
