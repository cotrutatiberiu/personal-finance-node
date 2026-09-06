import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: isDev ? process.env.LOG_LEVEL || "info" : "warn",
});
