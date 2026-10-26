import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: "app.html",
    },
  },
});
