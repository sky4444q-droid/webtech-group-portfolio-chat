// โหลดค่าจาก BE/.env ก่อนไฟล์อื่น (ต้อง import เป็นบรรทัดแรกของ app.ts)
// บน Render ไม่มีไฟล์ .env ใช้ค่าจากหน้า Environment แทน
// เขียนตัวอ่านเอง เพื่อให้ใช้ได้ทุกเวอร์ชัน Node (process.loadEnvFile มีแค่ Node 20.12+)
import fs from "node:fs";
import path from "node:path";

const file = path.join(__dirname, "..", ".env");

if (fs.existsSync(file)) {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
} else {
  console.warn(`⚠️ ไม่พบไฟล์ ${file} (ถ้ารันบน Render ไม่เป็นไร)`);
}
