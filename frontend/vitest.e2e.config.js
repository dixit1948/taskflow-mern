import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: { "import.meta.env.VITE_API_URL": JSON.stringify(process.env.E2E_API_URL || "http://localhost:5001/api") },
  test: { environment: "jsdom", globals: true, setupFiles: ["./qa-e2e/setup.js"], include: ["qa-e2e/**/*.test.jsx"], testTimeout: 40000 }
});
