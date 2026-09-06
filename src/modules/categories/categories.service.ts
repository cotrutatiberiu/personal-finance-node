import type { UserDetails } from "#common/types/UserDetails.js";
import * as categoriesSchema from "./categories.schema.js";
import { prisma } from "#db/client.js";
import { DuplicateResource, ResourceNotFound } from "#common/errors.js";

export async function create(
  userDetails: UserDetails,
  payload: categoriesSchema.CreateCategoryRequest,
) {
  // Parent category
  if (!payload.parentCategoryId) {
    const parentCategoryExists = await prisma.categories.count({
      where: {
        user_id: userDetails.id,
        name: { equals: payload.name, mode: "insensitive" },
        parent_category_id: null,
      },
    });

    if (parentCategoryExists) throw new DuplicateResource("Category");
  } else {
    const parentCategoryExists = await prisma.categories.count({
      where: {
        user_id: userDetails.id,
        id: payload.parentCategoryId,
      },
    });

    if (!parentCategoryExists) throw new ResourceNotFound("Parent category");

    const subCategoryExists = await prisma.categories.count({
      where: {
        user_id: userDetails.id,
        parent_category_id: payload.parentCategoryId,
        name: { equals: payload.name, mode: "insensitive" },
      },
    });

    if (subCategoryExists) throw new DuplicateResource("Subcategory");
  }

  return await prisma.categories.create({
    data: {
      user_id: userDetails.id,
      parent_category_id: payload.parentCategoryId || null,
      name: payload.name,
    },
  });
}

export async function getById(userDetails: UserDetails, categoryId: number) {
  const category = await prisma.categories.findFirst({
    where: { user_id: userDetails.id, id: categoryId },
  });
  if (!category) throw new ResourceNotFound("Category");

  return category;
}

export async function getCategories(
  userDetails: UserDetails,
  pageSize: number,
  page: number,
  orderBy: "name" | "created_at",
) {
  const categories = await prisma.categories.findMany({
    where: { user_id: userDetails.id },
    take: pageSize,
    skip: (page - 1) * pageSize,
    orderBy: { [orderBy]: "asc" },
  });

  return categories;
}