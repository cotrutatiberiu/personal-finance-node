import {
  paginationQuerySchema,
  SortOrder,
} from "#common/schemas/pagination.schema.js";
import { Prisma } from "#generated/prisma/client.js";
import { z } from "zod";

export enum CategoryOrderBy {
  NAME = "name",
  CREATED_AT = "created_at",
}

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
  orderBy: z.enum(CategoryOrderBy).default(CategoryOrderBy.CREATED_AT),
  order: z.enum(SortOrder).default(SortOrder.ASC),
});

export const reassignCategoryParentSchema = z.object({
  parentCategoryId: z.number().nullable(),
});

export type CreateCategoryRequest = z.infer<typeof createCategorySchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type GetCategoriesQuery = z.infer<typeof getCategoriesQuerySchema>;
export type ReassignCategoryParentRequest = z.infer<
  typeof reassignCategoryParentSchema
>;
export type Category = Prisma.categoriesGetPayload<{}>;
export type CategoryTreeDto = Category & { children: CategoryTreeDto[] };
