import type { Category, CategoryTreeDto } from "./categories.schema.js";

export const toDto = (category: Category) => category;

export const categoriesToTree = (
  rawCategories: Category[],
): CategoryTreeDto[] => {
  const byId = new Map<number, CategoryTreeDto>(
    rawCategories.map((c) => [c.id, { ...c, children: [] }]),
  );
  const roots: CategoryTreeDto[] = [];

  for (const category of byId.values()) {
    if (category.parent_category_id) {
      byId.get(category.parent_category_id)?.children.push(category);
    } else {
      roots.push(category);
    }
  }

  return roots;
};
