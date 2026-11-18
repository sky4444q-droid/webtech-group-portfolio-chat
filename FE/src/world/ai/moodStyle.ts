// แปลงอารมณ์ของ AI เป็นค่าภาพที่ทุกร่างใช้ร่วมกัน — ร่างแต่ละแบบตีความค่าเหล่านี้ในแบบของตัวเอง

import type { AiMood } from "../../store/useAi";

export interface MoodStyle {
  /** ความเร็วการเคลื่อนไหวภายใน (หมุน/ไหล) */
  speed: number;
  /** ความแรงของการเปลี่ยนรูป/การกระจายตัว */
  amp: number;
  /** ความสว่าง */
  glow: number;
  /** สีแทรก (null = สีปกติของร่าง) */
  tint: string | null;
  /** ความแรงของการพัลส์ตามจังหวะพูด */
  talk: number;
  /** ความแรงของการเด้ง */
  bounce: number;
  /** ความแรงของการสั่น */
  shake: number;
  /** อนุภาคไหลเข้าหาตัว (ฟัง) */
  inflow: number;
}

const BASE: MoodStyle = { speed: 1, amp: 1, glow: 1, tint: null, talk: 0, bounce: 0, shake: 0, inflow: 0 };

export const MOOD_STYLE: Record<AiMood, MoodStyle> = {
  idle: BASE,
  curious: { ...BASE, speed: 1.3, glow: 1.35 },
  listening: { ...BASE, speed: 0.8, glow: 1.2, inflow: 1 },
  thinking: { ...BASE, speed: 2.6, amp: 1.8, glow: 1.8 },
  speaking: { ...BASE, speed: 1.4, glow: 1.5, tint: "#ffd0f0", talk: 1 },
  happy: { ...BASE, speed: 1.8, glow: 1.9, tint: "#7dffcf", bounce: 1 },
  error: { ...BASE, speed: 0.6, glow: 1.3, tint: "#ff3d6e", shake: 1 },
};

/** จังหวะพยางค์จำลองตอนพูด (0..1) */
export function talkPulse(t: number): number {
  return Math.max(0, Math.sin(t * 13) * 0.6 + Math.sin(t * 7.3) * 0.4);
}
