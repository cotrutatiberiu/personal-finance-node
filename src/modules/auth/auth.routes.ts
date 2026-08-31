import { Router, type Router as ExpressRouter } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../common/middleware/validate.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

const router: ExpressRouter = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);

export default router;
