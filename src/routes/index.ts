import { Router, type Router as ExpressRouter } from "express";
import authRoutes from "#modules/auth/auth.routes.js";
import accountsRoutes from "#modules/accounts/accounts.routes.js";

const router: ExpressRouter = Router();

router.use("/api/auth", authRoutes);
router.use("/api/accounts", accountsRoutes);

export default router;