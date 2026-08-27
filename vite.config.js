import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` precisa casar com o nome do repo no GitHub Pages, senão todos os
// assets 404 em produção enquanto funcionam perfeitamente em dev.
export default defineConfig({
  plugins: [react()],
  base: process.env.MV_BASE ?? "/",
  build: {
    outDir: "dist",
    assetsInlineLimit: 2048,
  },
  server: { port: 5180, strictPort: false },
});
