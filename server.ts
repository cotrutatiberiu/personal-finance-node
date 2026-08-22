import express from "express";
import "express-async-errors";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import authRoutes from "./modules/auth/auth.routes";
import { errorHandler } from "./common/middleware/error";

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp());

app.use("/api/auth", authRoutes);

// must be registered LAST — after all routes
app.use(errorHandler);