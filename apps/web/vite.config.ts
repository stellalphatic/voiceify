import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@voiceify/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      },
    },
    optimizeDeps: {
      exclude: ["@voiceify/shared"],
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== "true",
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/health": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "es2022",
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "charts-vendor": ["recharts"],
            "motion-vendor": ["motion", "gsap"],
            "icons-vendor": ["lucide-react"],
          },
        },
      },
    },
  };
});
