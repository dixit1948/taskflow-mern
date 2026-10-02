import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev, /api is proxied to the backend so the auth cookie stays same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:5001", changeOrigin: false } }
  }
});
