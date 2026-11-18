// รูปและสีประจำตัวสมาชิก (ฝั่ง FE เท่านั้น — BE ไม่มีรูป) จับคู่จากชื่อเล่นภาษาอังกฤษในวงเล็บ เช่น "สกาย (Sky)"

import { COLORS } from "../config/theme";

export type MemberIcon = "cloud" | "code" | "database";

export interface MemberLook {
  photo: string;
  color: string;
  icon: MemberIcon;
}

const LOOKS: Record<string, MemberLook> = {
  sky: { photo: "/images/member-sky.webp", color: COLORS.cyan, icon: "cloud" },
  kao: { photo: "/images/member-kao.webp", color: COLORS.pink, icon: "code" },
  stamp: { photo: "/images/member-stamp.webp", color: COLORS.purple, icon: "database" },
};

/** หา look จากชื่อเล่น: ใช้คำในวงเล็บก่อน ถ้าไม่มีใช้ทั้งคำ · ไม่รู้จัก = null (แสดงเงาคนเหมือนเดิม) */
export function memberLook(nickname: string | null | undefined): MemberLook | null {
  if (!nickname) return null;
  const key = (nickname.match(/\(([^)]+)\)/)?.[1] ?? nickname).trim().toLowerCase();
  return LOOKS[key] ?? null;
}
