import { type Request, type Response, type NextFunction } from "express";
import { ZodType } from "zod";

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      validatedParams?: unknown;
      validatedHeaders?: unknown;
    }
  }
}

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const formattedErrors = result.error.flatten((issue) => issue.message);
      return res.status(400).json({
        error: "Validation failed",
        details: formattedErrors,
      });
    }

    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten((issue) => issue.message),
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

export function validateParams(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten((issue) => issue.message),
      });
    }
    req.validatedParams = result.data;
    next();
  };
}

export function validateHeaders(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.headers);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten((issue) => issue.message),
      });
    }
    req.validatedHeaders = result.data;
    next();
  };
}