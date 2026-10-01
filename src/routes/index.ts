import { Router, type Router as ExpressRouter } from "express";
import authRoutes from "#modules/auth/auth.routes.js";
import accountsRoutes from "#modules/accounts/accounts.routes.js";
import categoriesRoutes from "#modules/categories/categories.routes.js";
import transactionsRoutes from "#modules/transactions/transactions.routes.js";
import tagsRoutes from "#modules/tags/tags.routes.js";

const router: ExpressRouter = Router();

router.use("/api/auth", authRoutes);
router.use("/api/accounts", accountsRoutes);
router.use("/api/categories", categoriesRoutes);
router.use("/api/transactions", transactionsRoutes);
router.use("/api/tags", tagsRoutes);

export default router;