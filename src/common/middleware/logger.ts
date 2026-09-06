import { pinoHttp } from "pino-http";
import type { RequestHandler } from "express";

const isDev = process.env.NODE_ENV === "development";

const pinoMiddleware = pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

export const httpLogger: RequestHandler = isDev
  ? pinoMiddleware
  : (_req, _res, next) => next();