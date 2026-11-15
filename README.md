# Group Portfolio + Chat AI

เว็บ Portfolio ของกลุ่ม พร้อมแชท AI ที่ตอบคำถามเกี่ยวกับกลุ่มและสมาชิกแต่ละคน (React + Express + PostgreSQL + Gemini API)

## Features

- Chat with AI
- React frontend
- Express backend
- Gemini API integration

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express
- **AI:** Gemini API
- **Database:** SQLite

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sky4444q-droid/my-ai-chatbot.git
cd my-ai-chatbot
```

### 2. Install dependencies

Backend:

```bash
cd BE
npm install
```

Frontend:

```bash
cd ../FE
npm install
```

### 3. Configure environment variables

สร้างไฟล์ `BE/.env` ตามตัวอย่างใน `BE/.env.example` แล้วใส่ Gemini API key ของตัวเอง

**ห้ามเผยแพร่ API key หรืออัปโหลดไฟล์ `.env` ขึ้น GitHub**

### 4. Run the application

เปิด Terminal แรก:

```bash
cd BE
npm run dev
```

เปิด Terminal ที่สอง:

```bash
cd FE
npm run dev
```

จากนั้นเปิด URL ที่ Vite แสดงใน Terminal

## Project Status

Currently under development.
