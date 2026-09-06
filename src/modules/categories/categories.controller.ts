import { type Request, type Response } from "express";
import * as categoriesService from "./categories.service.js";
import * as categoriesSchema from "./categories.schema.js";

export async function createAccountSchema(req: Request, res: Response) {
  const category = await categoriesService.create(
    req.userDetails!,
    req.body as categoriesSchema.CreateCategoryRequest,
  );
  res.status(201).json(category);
}

export async function getById(req: Request, res: Response) {
  const { id } = req.validatedParams as categoriesSchema.CategoryIdParam;
  const category = await categoriesService.getById(req.userDetails!, id);
  res.status(200).json(category);
}

export async function getCategories(req: Request, res: Response) {
  const { page, pageSize, orderBy } =
    req.validatedQuery as categoriesSchema.GetCategoriesQuery;
  const categories = await categoriesService.getCategories(
    req.userDetails!,
    pageSize,
    page,
    orderBy,
  );
  res.status(200).json(categories);
}
