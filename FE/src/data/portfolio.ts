// ข้อมูล Portfolio ทั้งหมดของเว็บอยู่ที่ไฟล์นี้ไฟล์เดียว
// ตอนนี้ทุกช่องยังเป็น "รอข้อมูล" — เมื่อได้ข้อมูลจริง:
//   1) แก้ข้อความในช่อง th / en
//   2) เปลี่ยน placeholder เป็น false
//   3) วางรูปไว้ที่ public/images แล้วใส่ path เช่น "/images/member-1.jpg"
// จำนวนโปรเจกต์ 1–3 ชิ้น: ลบหรือเพิ่มรายการใน projects ได้เลย ฉากจะปรับจำนวนแท่นตาม

import type { Localized, Portfolio } from "../types";

export const PENDING: Localized = { th: "รอข้อมูล", en: "Awaiting data" };

function placeholderLabel(th: string, en: string): Localized {
  return { th: `${th} (รอข้อมูล)`, en: `${en} (awaiting data)` };
}

export const portfolio: Portfolio = {
  group: {
    placeholder: true,
    // ยืนยันแล้ว: ชื่อกลุ่มและโลโก้ (แนวคิด/จุดเด่นยังรอข้อมูล)
    name: { th: "NEXORA", en: "NEXORA" },
    logo: "/images/nexora-emblem.png",
    concept: PENDING,
    highlights: [PENDING],
  },

  members: [1, 2, 3].map((n) => ({
    id: `member-${n}`,
    placeholder: true,
    name: placeholderLabel(`สมาชิกคนที่ ${n}`, `Member ${n}`),
    role: PENDING,
    skills: [PENDING],
    works: [PENDING],
    photo: null,
  })),

  projects: [1, 2, 3].map((n) => ({
    id: `project-${n}`,
    placeholder: true,
    name: placeholderLabel(`ผลงานที่ ${n}`, `Project ${n}`),
    summary: PENDING,
    problem: PENDING,
    features: [PENDING],
    techStack: [],
    architecture: PENDING,
    images: [],
    demoUrl: null,
    githubUrl: null,
    memberIds: [],
  })),

  contacts: [
    { id: "contact-1", placeholder: true, label: placeholderLabel("ช่องทางที่ 1", "Channel 1"), value: PENDING, url: null },
    { id: "contact-2", placeholder: true, label: placeholderLabel("ช่องทางที่ 2", "Channel 2"), value: PENDING, url: null },
  ],
};
