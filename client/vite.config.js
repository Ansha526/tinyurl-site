import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: { "/api": "http://localhost:5000", "/s/": "http://localhost:5000" },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
