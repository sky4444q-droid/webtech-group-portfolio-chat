// โหลดค่าจาก BE/.env ก่อนไฟล์อื่น (ต้อง import เป็นบรรทัดแรกของ app.ts)
// บน Render ไม่มีไฟล์ .env ใช้ค่าจากหน้า Environment แทน
try {
  process.loadEnvFile();
} catch {
  // ไม่มีไฟล์ .env ก็ไม่เป็นไร
}
