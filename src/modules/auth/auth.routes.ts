import { Router, type Router as ExpressRouter } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../common/middleware/validate.js";
import { registerSchema } from "./auth.schema.js";

const router: ExpressRouter = Router();

router.post("/register", validate(registerSchema), authController.register);

export default router;
