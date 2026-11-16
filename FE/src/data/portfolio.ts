// ข้อมูล Portfolio ทั้งหมดของเว็บอยู่ที่ไฟล์นี้ไฟล์เดียว
// ตอนนี้ทุกช่องยังเป็น "รอข้อมูล" — เมื่อได้ข้อมูลจริง:
//   1) แก้ข้อความในช่อง th / en
//   2) เปลี่ยน placeholder เป็น false
//   3) วางรูปไว้ที่ public/images แล้วใส่ path เช่น "/images/member-1.jpg"
// จำนวนโปรเจกต์ 1–3 ชิ้น: ลบหรือเพิ่มรายการใน projects ได้เลย ฉากจะปรับจำนวนแท่นตาม

import type { Localized, Portfolio, Project } from "../types";

export const PENDING: Localized = { th: "รอข้อมูล", en: "Awaiting data" };

function placeholderLabel(th: string, en: string): Localized {
  return { th: `${th} (รอข้อมูล)`, en: `${en} (awaiting data)` };
}

// ผลงานที่แสดงมีชิ้นเดียว: เว็บที่ทีมกำลังทำอยู่นี้ (ทุกคนในทีมร่วมทำ)
export const NEXORA_PROJECT: Project = {
  id: "project-1",
  placeholder: false,
  name: { th: "NEXORA Virtual Universe", en: "NEXORA Virtual Universe" },
  summary: {
    th: "เว็บ Portfolio ของกลุ่มในรูปแบบโลกเสมือน 3D สไตล์ Cyberpunk พร้อม AI Assistant ที่ตอบคำถามเกี่ยวกับทีมจากข้อมูลจริงและแสดงแหล่งอ้างอิง",
    en: "Our group portfolio as a 3D Cyberpunk virtual world, with an AI assistant that answers questions about the team from real data and shows its sources.",
  },
  problem: {
    th: "ให้ผู้ชมรู้จักทีมและผลงานด้วยการสำรวจโลกเอง และถามข้อมูลทีมกับ AI ได้จากทุกพื้นที่",
    en: "Let visitors get to know the team by exploring a world, and ask the AI about the team from anywhere.",
  },
  features: [
    { th: "โลก 3D 5 พื้นที่ เดินทางผ่านประตูและ Mini Map", en: "3D world with 5 districts, travel via portals and a mini map" },
    { th: "แชทกับ AI ที่จำบทสนทนาแยกตามผู้ชม พร้อมแหล่งอ้างอิง", en: "AI chat with per-visitor history and sources" },
    { th: "ข้อมูลทีมดึงจากหลังบ้าน แหล่งเดียวกับที่ AI ใช้ตอบ", en: "Team data loaded from the backend, the same source the AI uses" },
    { th: "สลับภาษาไทย/อังกฤษ และปรับคุณภาพกราฟิกได้", en: "Thai/English switch and graphics quality setting" },
  ],
  techStack: ["React", "TypeScript", "Vite", "React Three Fiber", "Express", "PostgreSQL", "Gemini API", "GitHub Actions", "Render"],
  architecture: {
    th: "หน้าเว็บ React (Vite) → Express API (/messages, /portfolio) → Gemini API, เก็บประวัติแชทใน PostgreSQL, CI/CD ด้วย GitHub Actions และ Deploy บน Render",
    en: "React (Vite) frontend → Express API (/messages, /portfolio) → Gemini API, chat history in PostgreSQL, CI/CD with GitHub Actions, deployed on Render",
  },
  images: [],
  demoUrl: null,
  githubUrl: "https://github.com/sky4444q-droid/webtech-group-portfolio-chat",
  memberIds: [],
};

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

  projects: [NEXORA_PROJECT],

  contacts: [
    { id: "contact-1", placeholder: true, label: placeholderLabel("ช่องทางที่ 1", "Channel 1"), value: PENDING, url: null },
    { id: "contact-2", placeholder: true, label: placeholderLabel("ช่องทางที่ 2", "Channel 2"), value: PENDING, url: null },
  ],
};
