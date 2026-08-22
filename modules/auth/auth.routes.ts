import { Router } from "express";
import * as authController from "./auth.controller";
import { validate } from "../../common/middleware/validate";
import { requireAuth } from "../../common/middleware/auth";
import { registerSchema, loginSchema } from "./auth.schemas";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);

// a protected route just to prove the auth middleware works
router.get("/me", requireAuth, authController.me);

export default router;