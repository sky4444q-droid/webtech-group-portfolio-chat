// โทนสีกลางของเว็บ (ข้อเสนอ ยังไม่ล็อก) — เปลี่ยนที่นี่ที่เดียว
// ถ้าเปลี่ยนสี ให้แก้ตัวแปรสีใน styles.css (:root) ให้ตรงกันด้วย

export const COLORS = {
  bg: "#040406",
  fog: "#05070c",
  purple: "#b967ff",
  pink: "#ff2a6d",
  blue: "#2d6bff",
  cyan: "#05d9e8",
  green: "#39ff88",
  white: "#e9e6ff",
  /** แดงสดของ HUD */
  red: "#ff1f3d",
} as const;

/** สีแบรนด์ — ตรงกับ --brand-purple / --brand-magenta ใน styles.css */
export const BRAND = {
  purple: "#8B5CF6",
  magenta: "#D946EF",
  silver: "#C0C4D0",
} as const;
