import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

// const app: Express = express();

// Security and utility middleware
app.use(helmet());
// app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
// app.use("/health", (req: Request, res: Response) => {
//   res.status(200).json({ status: "ok" });
// });

app.use(express.json());
// app.use("/api/auth", authRoutes);
// app.use("/api/accounts", accountRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;