import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import router from './routes/index.js';

const app: Express = express();

// Security and utility middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(router);

app.use("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use(express.json());

export default app;
