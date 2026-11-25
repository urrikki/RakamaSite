import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base : nom du repo GitHub Pages (https://<user>.github.io/<repo>/)
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
  server: { port: 5173 },
});
