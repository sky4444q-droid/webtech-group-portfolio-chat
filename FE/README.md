# FE — Mini Chat (React + TypeScript + Vite)

Frontend ของ mini chat สัปดาห์ที่ 5 (อยู่ในโครง React Basics เดิม แต่เขียนด้วย React **TypeScript** ให้สอดคล้องกับ BE) ที่**เชื่อมกับ BE จริงแล้ว** ด้วย 2 กลไกหลัก:

1. **REST API** — ส่ง/อ่าน/ล้างข้อความผ่าน `fetch` ไปที่ Express Chat API
2. **Polling** — `setInterval` ถาม `GET /messages` ทุก 2 วินาที เพื่อรับข้อความใหม่แบบเกือบ real-time (วิธีง่ายสุดก่อนจะไปเรียน WebSocket)

## รัน (ต้องรัน BE ด้วย → ใช้ 2 terminal)

```bash
# Terminal 1 — BE (โฟลเดอร์ ../BE เทียบจาก FE)
cd ../BE
npm install
npm run dev             # http://localhost:3000

# Terminal 2 — FE (โฟลเดอร์ FE)
npm install
npm run dev             # เปิด http://localhost:5173
```

ทดสอบความ real-time: เปิด browser 2 หน้า แล้วส่งข้อความในหน้านึง — อีกหน้าจะได้ข้อความใหม่ภายใน ~2 วินาทีจาก polling

## โครงสร้าง — โครงเดียวกับ React Basics

```
FE/
├── vite.config.ts              ← proxy /messages → localhost:3000 (แก้ปัญหา CORS ตอน dev)
├── tsconfig.json               ← React + TS (strict เหมือนฝั่ง BE)
├── index.html
└── src/
    ├── main.tsx                ← จุดเริ่ม render (StrictMode)
    ├── types.ts                ← interface Message — "สัญญา" ชุดเดียวกับฝั่ง BE
    ├── App.tsx                 ← state messages + Effect (โหลด + polling) + handlers
    ├── api.ts                  ← fetch ทั้งหมดไว้ที่เดียว (GET / POST / DELETE /messages)
    ├── index.css
    └── components/
        ├── MessageBubble.tsx   ← props message { id, role, text } (Lab 1–2)
        ├── ChatLog.tsx         ← map + key + empty state + auto-scroll Effect (Lab 4, 8, 9)
        └── Composer.tsx        ← controlled input + preventDefault + disabled (Lab 5–7)
```

```bash
npm run typecheck   # เช็ค TypeScript ฝั่ง FE (แยกจากฝั่ง BE)
npm run build       # build จริงด้วย Vite
```

| ใน React Basics (สัปดาห์ 5) | ใน FE นี้ (integration) |
| --- | --- |
| mock reply สุ่มประโยคใน React | `POST /messages` → บอทตอบจาก `getReply` ฝั่ง BE |
| `useState` messages เริ่มจาก array ว่าง/seed | Effect โหลดจาก `GET /messages` ตอน mount |
| ข้อความใหม่มีแค่ในเครื่องเรา | **Polling** ทุก 2 วิ → เห็นข้อความจากทุกเครื่อง |
| ปุ่ม Clear history เคลียร์ state | `DELETE /messages` แล้วค่อยเคลียร์ state |
| shape `{ id, role, text }` | **ไม่เปลี่ยน** — BE ส่ง shape เดิมมาให้พอดี |

## จุดเรียนรู้ใหม่ของไฟล์นี้ (เทียบกับสัปดาห์ 5)

- **`api.ts`** — รวมทุก `fetch` ไว้ไฟล์เดียว ผูกกับ endpoint ของ BE ตรง ๆ (ถ้า BE เพิ่ม endpoint ใหม่ แก่นเดียวที่ต้องแตะคือไฟล์นี้) + `types.ts` ใช้ interface `Message` ชุดเดียวกับ BE — แก้ shape ที่ BE แล้ว TS ฝั่ง FE จะฟ้องทันที
- **Polling Effect ใน `App.tsx`** — `refresh()` ตอน mount + `setInterval` + `clearInterval` ใน cleanup (เขียน cleanup ไม่ครบ = timer ค้างและโดน request ยัดถล่ม)
- **Error state** — fetch พัง (เช่นลืมรัน BE) → แสดงแถบแดงแทนหน้าขาว
- **Vite proxy** — FE ยิงไป `/messages` (relative path) แล้ว Vite ส่งต่อไป `localhost:3000` ให้ → คนละ port แต่ไม่ติด CORS (เรื่อง CORS ลึก ๆ เรียนในสัปดาห์บูรณาการ)

## ต่อยอด (ถ้าเสร็จเร็ว)

- เพิ่ม **loading state** (spinner ตอนโหลดครั้งแรก) และ **optimistic update** (แสดงข้อความเราทันที ก่อน API ตอบ)
- ปุ่มเปิด/ปิด polling (เช่น checkbox "Live") — ลองสร้าง Effect ที่มี dependency เปลี่ยนได้
- Polling แบบฉลาดขึ้น: ดู `id` ล่าสุดที่มี แล้วถามหาเฉพาะข้อความที่ใหม่กว่านั้น
- เปลี่ยน `POLL_INTERVAL` เป็น 500ms แล้วเปิด DevTools → Network ดูว่าเกิดอะไรขึ้น
