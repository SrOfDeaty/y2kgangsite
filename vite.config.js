import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT || 5173),
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
