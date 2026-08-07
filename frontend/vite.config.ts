import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// バックエンドのプロキシ先（環境変数 BACKEND_URL で上書き可）
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // ローカル開発時は /api をバックエンドへプロキシ
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});
