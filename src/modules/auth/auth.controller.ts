import { type Request, type Response } from "express";
import * as authService from "./auth.service.js";

export async function register(req: Request, res: Response) {
  const user = await authService.register(req.body);
  res.status(201).json(user);
}

export async function login(req: Request, res: Response) {
  const payload = await authService.login(req.body);
  const REFRESH_SECRET_EXPIRATION_TIME =
    process.env.JWT_REFRESH_EXPIRATION_TIME!;
  res.cookie("rt", payload.refreshToken, {
    httpOnly: false,
    secure: true,
    maxAge: Number(REFRESH_SECRET_EXPIRATION_TIME) * 1000,
  });
  res.status(200).json({ accessToken: payload.accessToken });
}
