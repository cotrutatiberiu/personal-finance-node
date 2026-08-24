import { Router, type Router as ExpressRouter } from "express";
import authRoutes from "../modules/auth/auth.routes.js";

const router: ExpressRouter = Router();

router.use("/api/auth", authRoutes);

export default router;