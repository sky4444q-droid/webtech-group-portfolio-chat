# FE — Virtual Universe (React + TypeScript + Vite + React Three Fiber)

หน้าเว็บ Portfolio ของกลุ่มในรูปแบบโลกเสมือน 3D สไตล์ Cyberpunk มี AI Assistant ที่เรียกใช้ได้จากทุกพื้นที่

> สถานะ: รอบ 3 — เมืองนีออน 5 พื้นที่ มาสคอตพาเดินทาง ข้อมูลทีม/สมาชิก/ติดต่อโหลดจริงจากหลังบ้าน

## รัน

```bash
npm install
cp .env.example .env   # ใส่ VITE_API_URL ถ้าจะต่อหลังบ้านจริง
npm run dev            # เปิด http://localhost:5173
```

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | เปิดเว็บสำหรับพัฒนา |
| `npm test` | รันทดสอบ (Vitest) |
| `npm run typecheck` | เช็ค TypeScript |
| `npm run build` | เช็ค TypeScript แล้ว build ไปที่ `dist/` |

## ต่อกับหลังบ้าน (BE)

ตั้งค่าใน `.env` (คัดลอกจาก `.env.example`):

- `VITE_PROXY_TARGET` → ตอน `npm run dev` ส่ง `/messages` และ `/portfolio` ต่อไปหลังบ้านตัวนี้ (ค่าเริ่มต้น `http://localhost:3000`)
- `VITE_API_URL` → ตอน deploy ใส่ URL ของหลังบ้าน (ตอน dev ปล่อยว่าง)
- `VITE_USE_MOCK=true` → โหมดจำลอง ไม่เรียกหลังบ้านเลย

ข้อมูลทีม สมาชิก ผลงาน และช่องทางติดต่อ โหลดจาก `GET /portfolio` (ไฟล์ `BE/data/portfolio.json`) ถ้าโหลดไม่ได้จะแสดง "รอข้อมูล"
แชทส่ง `POST /messages` ด้วย `{ text, sessionId, language, district }` — โค้ดอยู่ที่ `src/services/chatApi.ts`

## ใส่ข้อมูลจริง

| อยากแก้ | ไฟล์ |
| --- | --- |
| แนวคิด จุดเด่น สมาชิก ผลงาน ช่องทางติดต่อ | `BE/data/portfolio.json` (แหล่งเดียวกับที่ AI ใช้ตอบ) |
| ชื่อกลุ่ม/โลโก้ และข้อมูลสำรองตอนโหลดไม่ได้ | `src/data/portfolio.ts` |
| รูปสมาชิก/ผลงาน | วางที่ `public/images/` แล้วใส่ path เช่น `/images/member-1.jpg` |
| ข้อความปุ่ม/คำแนะนำ | `src/i18n/th.ts`, `src/i18n/en.ts` |
| ชื่อพื้นที่ ร่าง AI ของแต่ละพื้นที่ | `src/config/districts.ts` |
| สีหลัก | `src/config/theme.ts` และตัวแปรสีใน `src/styles.css` |
| ระยะเวลา Intro / การเดินทาง | `src/config/timing.ts` |

## โครงสร้าง

```
src/
├─ App.tsx              ← ประกอบฉาก 3D + UI
├─ types.ts             ← ชนิดข้อมูลกลาง
├─ config/              ← พื้นที่, สี, เวลา
├─ data/portfolio.ts    ← ข้อมูลทั้งหมดของเว็บ
├─ i18n/                ← คำแปล TH/EN
├─ store/               ← สถานะกลาง (zustand): useWorld (โลก), useChat (แชท)
├─ services/chatApi.ts  ← คุยกับหลังบ้าน
├─ lib/                 ← localStorage ปลอดภัย, URL hash
├─ world/               ← ฉาก 3D: กล้อง, บรรยากาศ, ถนน, 5 พื้นที่, ร่าง AI, การเดินทาง
└─ ui/                  ← Intro, HUD + แถบเมนู (NavPills), แชท, Panel ข้อมูล
```

## หมายเหตุ

- ออกแบบสำหรับ Desktop เป็นหลัก
- ปุ่มตั้งค่า (⚙) สลับคุณภาพกราฟิก สูง/ต่ำ — ถ้าเครื่องช้า เว็บจะลดเป็น "ต่ำ" ให้อัตโนมัติ
- เปิดลิงก์ตรงเข้าพื้นที่ได้ เช่น `/#/projects`
