/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// ตอน dev หน้าเว็บเรียก /messages และ /portfolio ที่ localhost แล้ว Vite ส่งต่อไปหลังบ้าน
// ค่าเริ่มต้นคือหลังบ้านบนเครื่อง (localhost:3000) — ตั้ง VITE_PROXY_TARGET ใน .env เพื่อใช้ตัวบน Render
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const proxy = { target: env.VITE_PROXY_TARGET || "http://localhost:3000", changeOrigin: true };
  return {
    plugins: [react()],
    server: { port: 5173, proxy: { "/messages": proxy, "/portfolio": proxy } },
    test: { environment: "jsdom" },
  };
});
