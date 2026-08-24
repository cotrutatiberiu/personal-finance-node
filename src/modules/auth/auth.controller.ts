import { type Request, type Response } from "express";
import * as authService from "./auth.service.js";

export async function register(req: Request, res: Response) {
    const user = await authService.register(req.body);
    res.status(201).json(user);
}
