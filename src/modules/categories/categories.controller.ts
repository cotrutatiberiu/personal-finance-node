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

export async function getSubCategories(req: Request, res: Response){
  const {id}=req.validatedParams as categoriesSchema.CategoryIdParam;
  const subcategories=await categoriesService.getSubCategoriesById(req.userDetails!, id);
  res.status(200).json(subcategories);
}

export async function getTree(req: Request, res: Response) {
  const tree = await categoriesService.getTree(req.userDetails!);
  res.status(200).json(tree);
}

export async function reassignParent(req: Request, res: Response) {
  const { id } = req.validatedParams as categoriesSchema.CategoryIdParam;
  const { parentCategoryId } =
    req.body as categoriesSchema.ReassignCategoryParentRequest;
  const category = await categoriesService.reassignParent(
    req.userDetails!,
    id,
    parentCategoryId,
  );
  res.status(200).json(category);
}
