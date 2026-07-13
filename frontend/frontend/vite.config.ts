import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const proxyTarget = process.env.API_PROXY_TARGET || process.env.VITE_API_URL || "https://janniti-wp5a.onrender.com";
const rewriteApiPath = (path: string) => {
  if (path === "/api/citizen/submit") return "/submit";
  if (path === "/api/dashboard") return "/dashboard";
  if (path === "/api/analytics") return "/analytics";
  if (path.startsWith("/api/workflow/")) return path.replace("/api/workflow/", "/workflow/");
  if (path.startsWith("/api/report/")) return path.replace("/api/report/", "/report/");
  if (path.startsWith("/api/demo/request/")) return path.replace("/api/demo/request/", "/demo/request/");
  if (path.startsWith("/api/demo/run/")) return path.replace("/api/demo/run/", "/demo/run/");
  if (path.startsWith("/api/demo/requests")) return "/demo/requests";
  return path.replace(/^\/api/, "");
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Keep browser requests same-origin during local testing while forwarding the
      // actual /api traffic to the selected backend.
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
        rewrite: rewriteApiPath
      }
    }
  }
});
