import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  build: {
    target: ["es2015", "safari11"],
    cssTarget: "safari11",
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        app: "app.html",
        apply: "apply.html",
      },
    },
  },
});
