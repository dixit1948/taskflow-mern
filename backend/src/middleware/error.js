import { ZodError } from "zod";

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notFound = (req, res) =>
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".");
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return res.status(400).json({ message: err.issues[0]?.message || "Invalid input", fields });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON body" });
  }
  if (err?.name === "CastError" || err?.name === "ValidationError") {
    return res.status(400).json({ message: "Invalid data" });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: "That value is already in use" });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? "Something went wrong on our side. Please try again." : err.message
  });
}
