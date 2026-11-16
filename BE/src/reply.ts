import fs from "node:fs";
import path from "node:path";
import { askLlm, isLlmConfigured, type ChatTurn } from "./llm";
import type { Source } from "./db";

export type Language = "th" | "en";

export interface Reply {
  text: string;
  sources: Source[];
}

const TEAM_SOURCE: Source = { title: "ข้อมูลโปรไฟล์ทีม", url: null };

// ข้อมูลทีมอยู่ใน data/portfolio.json (แก้ไฟล์นั้น ไม่ต้องแก้โค้ดนี้)
interface Portfolio {
  group?: {
    name?: string | null;
    concept?: string | null;
    highlights?: string[];
    sharedWorks?: string[];
    contact?: Record<string, string | null>;
  };
  members?: {
    name?: string | null;
    role?: string | null;
    skills?: string[];
    works?: string[];
    contact?: string | null;
  }[];
}

export function loadPortfolio(): Portfolio {
  const file = path.join(__dirname, "..", "data", "portfolio.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as Portfolio;
}

// แปลง portfolio.json เป็นข้อความ โดยข้ามช่องที่ยังว่าง
function portfolioToText(p: Portfolio): string {
  const lines: string[] = [];
  const g = p.group ?? {};
  if (g.name) lines.push(`- ชื่อกลุ่ม: ${g.name}`);
  if (g.concept) lines.push(`- แนวคิด: ${g.concept}`);
  if (g.highlights?.length) lines.push(`- จุดเด่น: ${g.highlights.join("; ")}`);
  if (g.sharedWorks?.length) lines.push(`- ผลงานร่วมกัน: ${g.sharedWorks.join("; ")}`);
  const contact = Object.entries(g.contact ?? {}).filter(([, v]) => v);
  if (contact.length) lines.push(`- ช่องทางติดต่อกลุ่ม: ${contact.map(([k, v]) => `${k}: ${v}`).join(", ")}`);

  for (const m of p.members ?? []) {
    if (!m.name) continue;
    lines.push(`\n## สมาชิก: ${m.name}`);
    if (m.role) lines.push(`- บทบาท: ${m.role}`);
    if (m.skills?.length) lines.push(`- ทักษะ: ${m.skills.join(", ")}`);
    if (m.works?.length) lines.push(`- ผลงาน: ${m.works.join("; ")}`);
    if (m.contact) lines.push(`- ติดต่อ: ${m.contact}`);
  }
  return lines.length ? lines.join("\n") : "(ยังไม่มีข้อมูลทีมในระบบ)";
}

function buildSystemPrompt(language: Language, district?: string): string {
  const langRule =
    language === "en"
      ? "Reply in English."
      : "ตอบเป็นภาษาไทย";
  const place = district ? `\n- ผู้ใช้กำลังอยู่ที่พื้นที่: ${district} (ปรับน้ำเสียงให้เข้ากับฉากนี้ได้เล็กน้อย แต่ห้ามเปลี่ยนข้อเท็จจริง)` : "";

  return `# Persona
คุณคือ AI Assistant ของเว็บไซต์ Portfolio ของกลุ่ม มีตัวตนของตัวเอง ไม่ได้พูดแทนสมาชิกคนใดคนหนึ่ง
ฉลาด เป็นมิตร สุขุม และปรับน้ำเสียงตามสถานการณ์ของผู้ใช้

# ข้อมูลทีม (แหล่งข้อมูลเดียวที่ใช้ตอบเรื่องทีม)
${portfolioToText(loadPortfolio())}

# Task
- ถ้าผู้ใช้ถามเรื่องกลุ่มหรือสมาชิกคนไหน ให้ตอบเฉพาะข้อมูลของคนนั้นหรือกลุ่มนั้น จากหัวข้อ "ข้อมูลทีม" เท่านั้น
- ถ้าผู้ใช้ถามคำถามทั่วไปที่ไม่เกี่ยวกับ Portfolio ให้ตอบได้ตามปกติ

# Response Style
- ${langRule}
- ตอบตรงคำถาม กระชับ โดยทั่วไป 1-4 ประโยค${place}

# Rules
- ห้ามแต่งประวัติ ประสบการณ์ ทักษะ ผลงาน หรือช่องทางติดต่อที่ไม่มีใน "ข้อมูลทีม"
- ห้ามกล่าวว่าโปรเจกต์ใดเสร็จแล้ว หากไม่มีข้อมูลยืนยัน และแยกงานที่เสร็จ กำลังทำ และวางแผนไว้ให้ชัดเจน
- หากไม่ทราบข้อมูลของทีม ให้บอกตรง ๆ ว่าไม่มีข้อมูลยืนยันในส่วนนี้
- ห้ามแต่งลิงก์หรือ URL ขึ้นมาเอง

# Output format
ขึ้นต้นคำตอบด้วยแท็กเดียวเสมอ ตามด้วยช่องว่างแล้วจึงตอบ
- [TEAM] ถ้าคำตอบใช้ข้อมูลจาก "ข้อมูลทีม"
- [GENERAL] ถ้าเป็นคำตอบทั่วไปที่ไม่ได้ใช้ข้อมูลทีม`;
}

const FALLBACK = "ขออภัยครับ ตอนนี้ระบบตอบคำถามยังไม่พร้อมใช้งาน";
let warned = false;

export async function getReply(
  text: string,
  history: ChatTurn[] = [],
  language: Language = "th",
  district?: string,
): Promise<Reply> {
  if (!isLlmConfigured()) {
    if (!warned) {
      console.warn("⚠️ ยังไม่ได้ตั้ง LLM_API_KEY ใน BE/.env — ใช้คำตอบสำรองแทน AI จริง (ดู BE/.env.example)");
      warned = true;
    }
    return { text: FALLBACK, sources: [] };
  }

  const raw = await askLlm(buildSystemPrompt(language, district), [
    ...history,
    { role: "user", content: text },
  ]);

  const m = raw.match(/^\s*\[(TEAM|GENERAL)\]\s*/i);
  const isTeam = m?.[1].toUpperCase() === "TEAM";
  return {
    text: m ? raw.slice(m[0].length) : raw,
    sources: isTeam ? [TEAM_SOURCE] : [],
  };
}
