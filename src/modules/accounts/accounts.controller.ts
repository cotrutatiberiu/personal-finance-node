import { type Request, type Response } from "express";
import * as accountsService from "./accounts.service.js";

export async function createAccount(req: Request, res: Response) {
  const account = await accountsService.create(req.userDetails!, req.body);
  res.status(201).json(account);
}

export async function updateAccount(req: Request, res: Response) {
  const account = await accountsService.update(
    req.userDetails!,
    Number(req.params.id),
    req.body,
  );
  res.status(200).json(account);
}
