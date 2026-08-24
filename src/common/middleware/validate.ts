import { type Request, type Response, type NextFunction } from "express";
import { ZodType } from "zod";

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
