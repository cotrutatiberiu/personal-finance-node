import type { UserDetails } from "#common/types/UserDetails.js";
import * as categoriesSchema from "./categories.schema.js";
import { prisma } from "#db/client.js";
import {
  DuplicateResource,
  InvalidCategoryParentError,
  ResourceNotFound,
} from "#common/errors.js";
import * as categoriesMapper from "./categories.mapper.js";

export async function create(
  userDetails: UserDetails,
  payload: categoriesSchema.CreateCategoryRequest,
) {
  // Create Parent category
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
    // Create Sub Category
    const parentCategory = await prisma.categories.findFirst({
      where: {
        user_id: userDetails.id,
        id: payload.parentCategoryId,
      },
    });

    if (!parentCategory) throw new ResourceNotFound("Parent category");

    if (parentCategory.parent_category_id !== null) {
      throw new InvalidCategoryParentError(
        "Only one level of subcategories is allowed",
      );
    }

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

  return categories.map(categoriesMapper.toDto);
}

export async function getSubCategoriesById(
  userDetails: UserDetails,
  parentId: number,
) {
  const categories = await prisma.categories.findMany({
    where: { user_id: userDetails.id, parent_category_id: parentId },
  });

  return categories.map(categoriesMapper.toDto);
}

export async function reassignParent(
  userDetails: UserDetails,
  categoryId: number,
  newParentId: number | null,
) {
  const category = await prisma.categories.findFirst({
    where: { user_id: userDetails.id, id: categoryId },
  });
  if (!category) throw new ResourceNotFound("Category");

  if (newParentId !== null) {
    if (newParentId === categoryId) {
      throw new InvalidCategoryParentError(
        "A category cannot be its own parent",
      );
    }

    const newParent = await prisma.categories.findFirst({
      where: { user_id: userDetails.id, id: newParentId },
    });
    if (!newParent) throw new ResourceNotFound("Parent category");

    if (newParent.parent_category_id !== null) {
      throw new InvalidCategoryParentError(
        "Only one level of subcategories is allowed",
      );
    }

    const hasChildren = await prisma.categories.count({
      where: { user_id: userDetails.id, parent_category_id: categoryId },
    });
    if (hasChildren) {
      throw new InvalidCategoryParentError(
        "A category with subcategories cannot be moved under another category",
      );
    }
  }

  const updatedCategory = await prisma.categories.update({
    where: { id: categoryId },
    data: { parent_category_id: newParentId },
  });

  return categoriesMapper.toDto(updatedCategory);
}

export async function getTree(userDetails: UserDetails) {
  const categories = await prisma.categories.findMany({
    where: { user_id: userDetails.id },
  });

  return categoriesMapper.categoriesToTree(categories);
}
