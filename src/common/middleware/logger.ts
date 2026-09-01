import { pinoHttp } from "pino-http";

export const httpLogger = pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});