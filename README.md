# NEXORA — Group Portfolio + Chat AI

เว็บ Portfolio ของกลุ่มในรูปแบบโลกเสมือน 3D (Virtual Universe) พร้อม AI Assistant ที่ตอบคำถามเกี่ยวกับกลุ่มและสมาชิกแต่ละคน รวมถึงคำถามทั่วไป

งานกลุ่มรายวิชา Web Technology (MI311/AIE312) Section 338B มหาวิทยาลัยกรุงเทพ

## ลิงก์

| | URL |
| --- | --- |
| เว็บไซต์ (Frontend) | https://webtech-chat-web.onrender.com |
| API (Backend) | https://webtech-chat-api.onrender.com |
| Repository | https://github.com/sky4444q-droid/webtech-group-portfolio-chat |

> Render แพ็กเกจฟรีจะหลับเมื่อไม่มีคนใช้ เปิดครั้งแรกอาจรอประมาณ 1 นาที

## สมาชิกและหน้าที่

| สมาชิก | หน้าที่ |
| --- | --- |
| วัชรนันท์ บัวทิพย์ (สกาย) | Deploy / DevOps — Render, PostgreSQL, CI/CD, รวมงานเข้า main |
| อภิมุข เล็กทองมาก (เก้า) | Frontend — โลก 3D, UI, หน้า Portfolio |
| จิรวัฒน์ ลาภเจียม (แสตมป์) | Backend — API, AI prompt, แหล่งอ้างอิง |

## ฟีเจอร์

- **Portfolio ของกลุ่ม** — แนะนำกลุ่ม สมาชิกแต่ละคน ผลงาน และช่องทางติดต่อ ในรูปแบบโลก 3D
- **Chat AI** — ตอบจากข้อมูลทีมใน `BE/data/portfolio.json` และตอบคำถามทั่วไปได้ ห้ามแต่งข้อมูลที่ไม่มี
- **ประวัติแชทแยกตามผู้ใช้** — เก็บใน PostgreSQL แยกด้วย `sessionId` ผู้ใช้แต่ละคนเห็นเฉพาะแชทของตัวเอง
- **AI จำบทสนทนา** — ส่งข้อความล่าสุด 10 ข้อความของ session ให้ AI ทุกครั้ง
- **2 ภาษา** — ไทย / อังกฤษ
- **แหล่งอ้างอิง** — คำตอบที่มาจากข้อมูลทีมแนบ source และลิงก์ผลงานจริง
- **CI/CD** — GitHub Actions เช็กโค้ดทุกครั้งที่ push และ Deploy ขึ้น Render อัตโนมัติ

## Tech Stack

| ส่วน | เทคโนโลยี |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Three Fiber (three.js), Zustand |
| Backend | Node.js, Express, TypeScript (tsx) |
| Database | PostgreSQL (`pg`) |
| AI | Google Gemini (ผ่าน OpenAI-compatible API) |
| Deploy | Render (Web Service + Static Site + PostgreSQL) |
| CI/CD | GitHub Actions |

## โครงสร้างโปรเจกต์

```
BE/                    Backend (Express)
  data/portfolio.json  ข้อมูลกลุ่มและสมาชิก (แหล่งข้อมูลเดียวที่ AI ใช้ตอบ)
  src/app.ts           API routes
  src/db.ts            เชื่อมต่อ PostgreSQL / ตาราง messages
  src/reply.ts         สร้าง system prompt จาก portfolio.json + แหล่งอ้างอิง
  src/llm.ts           เรียก Gemini
  .env.example         ตัวอย่างค่าตั้งค่า (ไม่มีคีย์จริง)
FE/                    Frontend (React + Vite)
  src/world/           โลก 3D
  src/ui/              หน้าจอ UI, แชท
  src/services/        เรียก API หลังบ้าน
  .env.example
.github/workflows/ci.yml   CI/CD
```

## วิธีติดตั้งและรันบนเครื่อง

ต้องมี Node.js 20 ขึ้นไป และ Git

### 1. Clone

```bash
git clone https://github.com/sky4444q-droid/webtech-group-portfolio-chat.git
cd webtech-group-portfolio-chat
```

### 2. Backend

```bash
cd BE
npm install
cp .env.example .env
```

แก้ไฟล์ `BE/.env`

| ตัวแปร | ความหมาย |
| --- | --- |
| `LLM_API_KEY` | Gemini API key สร้างที่ https://aistudio.google.com/apikey |
| `LLM_MODEL` | ชื่อโมเดล Gemini |
| `DATABASE_URL` | PostgreSQL connection string (Render: External Database URL / Neon: Connection string) |
| `CORS_ORIGIN` | โดเมนหน้าเว็บที่อนุญาตให้เรียก API เช่น `http://localhost:5173` |

```bash
npm run dev
```

ต้องขึ้น `Server is running on port 3000` (ตาราง `messages` ถูกสร้างอัตโนมัติ)

### 3. Frontend (เปิด Terminal ใหม่)

```bash
cd FE
npm install
cp .env.example .env
npm run dev
```

เปิด http://localhost:5173

- ใช้หลังบ้านบนเครื่อง: ลบหรือเว้นว่าง `VITE_PROXY_TARGET` ใน `FE/.env` (ค่าเริ่มต้น `http://localhost:3000`)
- ใช้หลังบ้านบน Render (ไม่ต้องมีคีย์/ฐานข้อมูล): ตั้ง `VITE_PROXY_TARGET=https://webtech-chat-api.onrender.com`

> **ห้ามเผยแพร่ API key หรือ commit ไฟล์ `.env` ขึ้น GitHub** (ไฟล์ `.env` ถูก ignore ไว้แล้ว)

## API

| Method | Path | ทำอะไร |
| --- | --- | --- |
| GET | `/portfolio` | ข้อมูลกลุ่มและสมาชิก |
| GET | `/messages?sessionId=...` | ประวัติแชทของ session |
| POST | `/messages` | ส่งข้อความ `{ text, sessionId?, language?: "th" \| "en" }` ได้ `{ sessionId, userMessage, assistantMessage, sources }` |
| PUT | `/messages/:id` | แก้ข้อความ (เฉพาะ session ตัวเอง) |
| DELETE | `/messages/:id?sessionId=...` | ลบข้อความ (เฉพาะ session ตัวเอง) |
| DELETE | `/messages?sessionId=...` | ล้างประวัติของ session |

## CI/CD

ไฟล์ `.github/workflows/ci.yml` ทำงานทุกครั้งที่ push หรือเปิด Pull Request เข้า `main`

1. **Backend (check)** — `npm ci` แล้ว `npm run check` (TypeScript)
2. **Frontend (typecheck + build)** — `npm ci`, `npm run typecheck`, `npm run build`
3. **Deploy to Render** — เฉพาะตอน push เข้า `main` และสองขั้นแรกผ่าน จะเรียก Render Deploy Hook ของ Backend และ Frontend (เก็บใน GitHub Secrets `RENDER_BE_DEPLOY_HOOK`, `RENDER_FE_DEPLOY_HOOK`)

ขั้นตอนการทำงานของทีม: แต่ละคนทำงานใน branch ของตัวเอง (`feature/...`) → เปิด Pull Request → CI ต้องผ่าน → merge เข้า `main` → Deploy อัตโนมัติ

## การ Deploy บน Render

| Service | ประเภท | ตั้งค่า |
| --- | --- | --- |
| `webtech-chat-db` | PostgreSQL | Free plan |
| `webtech-chat-api` | Web Service | Root `BE`, Build `npm install`, Start `npm start`, Env: `LLM_API_KEY`, `LLM_MODEL`, `DATABASE_URL`, `CORS_ORIGIN`, `NODE_VERSION=22` |
| `webtech-chat-web` | Static Site | Root `FE`, Build `npm install && npm run build`, Publish `dist`, Env: `VITE_API_URL` |
