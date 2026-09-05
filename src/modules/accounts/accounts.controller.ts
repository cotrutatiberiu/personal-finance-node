import { type Request, type Response } from "express";
import * as accountsService from "./accounts.service.js";
import * as accountsSchema from "./accounts.schema.js";

export async function create(req: Request, res: Response) {
  const account = await accountsService.create(req.userDetails!, req.body);
  res.status(201).json(account);
}

export async function getById(req: Request, res: Response) {
  const account = await accountsService.getById(req.userDetails!, req.body);
  res.status(200).json(account);
}

export async function getAccounts(req: Request, res: Response) {
  const { page, pageSize, orderBy } =
    req.validatedQuery as accountsSchema.GetAccountsQuery;
  const accounts = await accountsService.getAccounts(
    req.userDetails!,
    pageSize,
    page,
    orderBy,
  );
  res.status(200).json(accounts);
}

export async function updatebyId(req: Request, res: Response) {
  const account = await accountsService.update(
    req.userDetails!,
    Number(req.params.id),
    req.body,
  );
  res.status(200).json(account);
}

export async function archiveById(req: Request, res: Response) {
  await accountsService.archiveById(req.userDetails!, Number(req.params.id));
  res.status(204).send();
}
