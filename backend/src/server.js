import mongoose from "mongoose";
import { config } from "./config.js";
import { connectDB } from "./db.js";
import { createApp } from "./app.js";

try {
  await connectDB();
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  process.exit(1);
}

const server = createApp().listen(config.port, () => {
  console.log(`TaskFlow API running at http://localhost:${config.port}`);
});

const shutdown = signal => {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
