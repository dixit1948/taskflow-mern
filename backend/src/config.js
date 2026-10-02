import "dotenv/config";

const required = key => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5001,
  mongoUri: required("MONGODB_URI"),
  dbName: process.env.DB_NAME || "taskflow",
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresDays: Number(process.env.JWT_EXPIRES_DAYS) || 7,
  sameSite: process.env.COOKIE_SAMESITE || "lax",
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map(origin => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean)
};

export const isProd = config.env === "production";
