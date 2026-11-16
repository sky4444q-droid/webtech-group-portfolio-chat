import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// ตอนรันบนเครื่อง (npm run dev) Vite จะส่งต่อการเรียก API ไปที่ VITE_PROXY_TARGET
// ค่าเริ่มต้นคือหลังบ้านบนเครื่อง (localhost:3000)
// ถ้าไม่อยากรันหลังบ้านเอง ตั้งใน FE/.env เป็น https://webtech-chat-api.onrender.com
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:3000';
  const proxy = { target, changeOrigin: true };

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/messages': proxy,
        '/portfolio': proxy,
      },
    },
  };
});
