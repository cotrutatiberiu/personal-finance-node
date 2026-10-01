import {
  paginationQuerySchema,
  SortOrder,
} from "#common/schemas/pagination.schema.js";
import { Prisma } from "#generated/prisma/client.js";
import { z } from "zod";

export enum TagOrderBy {
  NAME = "name",
  CREATED_AT = "created_at",
}

const tagName = z
  .string()
  .trim()
  .min(1, "Tag name is required")
  .max(50, "Tag name cannot exceed 50 characters");

export const createTagSchema = z.object({
  name: tagName,
});

export const updateTagSchema = z.object({
  name: tagName,
});

export const tagIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const getTagsQuerySchema = paginationQuerySchema.extend({
  orderBy: z.enum(TagOrderBy).default(TagOrderBy.NAME),
  order: z.enum(SortOrder).default(SortOrder.ASC),
});

export type CreateTagRequest = z.infer<typeof createTagSchema>;
export type UpdateTagRequest = z.infer<typeof updateTagSchema>;
export type TagIdParam = z.infer<typeof tagIdParamSchema>;
export type GetTagsQuery = z.infer<typeof getTagsQuerySchema>;
export type Tag = Prisma.tagsGetPayload<{}>;
