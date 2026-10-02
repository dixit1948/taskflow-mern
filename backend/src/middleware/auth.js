import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "./error.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = req.cookies?.token || (header?.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) return next(new AppError(401, "Please sign in to continue"));

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, "Your session has expired. Please sign in again."));
  }
}
