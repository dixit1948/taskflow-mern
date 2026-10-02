import dns from "node:dns";
import mongoose from "mongoose";
import { config } from "./config.js";

// Some networks cannot resolve Atlas SRV records; public DNS fixes that.
if (process.env.USE_PUBLIC_DNS !== "false") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

export async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, {
    dbName: config.dbName,
    serverSelectionTimeoutMS: 10000
  });
  console.log(`MongoDB connected (${config.dbName})`);
}
