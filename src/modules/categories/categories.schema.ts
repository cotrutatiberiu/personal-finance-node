import { paginationQuerySchema } from "#common/schemas/pagination.schema.js";
import { z } from "zod";

export const createCategorySchema = z.object({
  parentCategoryId: z.number().nullish(),
  name: z
    .string()
    .min(1, "Account name is required")
    .max(255, "Account name name cannot exceed 50 characters"),
});

export const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const getCategoriesQuerySchema = paginationQuerySchema.extend({
  orderBy: z.enum(["name", "created_at"]).default("created_at"),
});

export type CreateCategoryRequest = z.infer<typeof createCategorySchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type GetCategoriesQuery = z.infer<typeof getCategoriesQuerySchema>;