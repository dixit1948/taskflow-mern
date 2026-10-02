import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config, isProd } from "./config.js";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import { AppError, notFound, errorHandler } from "./middleware/error.js";

const isAllowedOrigin = origin => !origin || config.clientOrigins.includes(origin);

// Extra CSRF protection for cookie auth: reject state-changing calls from unknown sites.
const originGuard = (req, res, next) => {
  const safe = ["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (!safe && !isAllowedOrigin(req.headers.origin)) {
    return next(new AppError(403, "Request blocked: unknown origin"));
  }
  next();
};

export function createApp() {
  const app = express();

  // Number of reverse proxies in front of the API (Render = 1; Vercel rewrite + Render = 2).
  // Needed so rate limiting sees each visitor's real IP instead of the proxy's.
  if (isProd) app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: (origin, callback) =>
        isAllowedOrigin(origin)
          ? callback(null, true)
          : callback(new AppError(403, "Origin not allowed by CORS")),
      credentials: true
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(morgan(isProd ? "combined" : "dev"));

  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { message: "Too many requests. Try again in a minute." }
    }),
    originGuard
  );

  app.get("/", (req, res) => res.send("TaskFlow API is running"));
  app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));
  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", taskRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
