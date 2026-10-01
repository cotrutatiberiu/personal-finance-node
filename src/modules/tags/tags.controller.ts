import { type Request, type Response } from "express";
import * as tagsService from "./tags.service.js";
import * as tagsSchema from "./tags.schema.js";

export async function createTag(req: Request, res: Response) {
  const tag = await tagsService.create(
    req.userDetails!,
    req.body as tagsSchema.CreateTagRequest,
  );
  res.status(201).json(tag);
}

export async function getById(req: Request, res: Response) {
  const { id } = req.validatedParams as tagsSchema.TagIdParam;
  const tag = await tagsService.getById(req.userDetails!, id);
  res.status(200).json(tag);
}

export async function getTags(req: Request, res: Response) {
  const { page, pageSize, orderBy, order } =
    req.validatedQuery as tagsSchema.GetTagsQuery;
  const tags = await tagsService.getTags(
    req.userDetails!,
    pageSize,
    page,
    orderBy,
    order,
  );
  res.status(200).json(tags);
}

export async function renameTag(req: Request, res: Response) {
  const { id } = req.validatedParams as tagsSchema.TagIdParam;
  const tag = await tagsService.rename(
    req.userDetails!,
    id,
    req.body as tagsSchema.UpdateTagRequest,
  );
  res.status(200).json(tag);
}

export async function deleteTag(req: Request, res: Response) {
  const { id } = req.validatedParams as tagsSchema.TagIdParam;
  await tagsService.deleteById(req.userDetails!, id);
  res.status(204).send();
}
