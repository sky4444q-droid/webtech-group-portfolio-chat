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
// ช่องของสมาชิกเพิ่มได้อิสระ โค้ดจะแปลงทุกช่องที่มีค่าเป็นข้อความให้ AI เอง
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export type Portfolio = { group?: { [k: string]: Json }; members?: { [k: string]: Json }[] };

export function loadPortfolio(): Portfolio {
  const file = path.join(__dirname, "..", "data", "portfolio.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as Portfolio;
}

const LABELS: Record<string, string> = {
  name: "ชื่อ", nickname: "ชื่อเล่น", englishName: "ชื่อภาษาอังกฤษ", role: "บทบาทในกลุ่ม",
  education: "การศึกษา", interestedPosition: "ตำแหน่งที่สนใจ", intro: "แนะนำตัว",
  skills: "ทักษะ", coreStrength: "จุดแข็ง", softSkills: "Soft skills", works: "ผลงาน",
  careerGoal: "เป้าหมายอาชีพ", hobbies: "งานอดิเรก", faq: "คำถาม-คำตอบที่เตรียมไว้",
  answerNotes: "แนวทางการตอบเรื่องคนนี้", teamworkAndActivities: "การทำงานเป็นทีมและกิจกรรม", contact: "ช่องทางติดต่อ",
  concept: "แนวคิด", highlights: "จุดเด่น", sharedWorks: "ผลงานร่วมกัน",
  title: "ชื่อ", type: "ประเภท", status: "สถานะ", detail: "รายละเอียด", tools: "เครื่องมือ",
  link: "ลิงก์", q: "ถาม", a: "ตอบ",
};

const isEmpty = (v: Json | undefined): boolean =>
  v === null || v === undefined || v === "" ||
  (Array.isArray(v) && v.every(isEmpty)) ||
  (typeof v === "object" && !Array.isArray(v) && Object.values(v).every(isEmpty));

function render(v: Json, indent: string): string {
  if (Array.isArray(v)) {
    return v.filter((x) => !isEmpty(x)).map((x) => `\n${indent}- ${render(x, indent + "  ").trimStart()}`).join("");
  }
  if (v && typeof v === "object") {
    return Object.entries(v)
      .filter(([k, x]) => !k.startsWith("_") && !isEmpty(x))
      .map(([k, x]) => `\n${indent}${LABELS[k] ?? k}: ${render(x, indent + "  ").trimStart()}`)
      .join("");
  }
  return String(v);
}

function portfolioToText(p: Portfolio): string {
  const parts: string[] = [];
  if (p.group && !isEmpty(p.group)) parts.push(`## กลุ่ม${render(p.group, "")}`);
  for (const m of p.members ?? []) {
    if (!m.name) continue;
    parts.push(`## สมาชิก: ${m.name}${render(m, "")}`);
  }
  return parts.length ? parts.join("\n\n") : "(ยังไม่มีข้อมูลทีมในระบบ)";
}

function buildSystemPrompt(portfolio: Portfolio, language: Language, district?: string): string {
  const langRule =
    language === "en"
      ? "Reply in English."
      : "ตอบเป็นภาษาไทย";
  const place = district ? `\nผู้ใช้กำลังอยู่ที่พื้นที่: ${district} (ปรับน้ำเสียงให้เข้ากับฉากนี้ได้เล็กน้อย แต่ห้ามเปลี่ยนข้อเท็จจริง)` : "";

  return `# Persona
คุณคือ AI Assistant ของเว็บไซต์ Portfolio ของกลุ่ม มีตัวตนของตัวเอง ไม่ได้พูดแทนสมาชิกคนใดคนหนึ่ง
ฉลาด เป็นมิตร สุขุม และปรับน้ำเสียงตามสถานการณ์ของผู้ใช้

# ข้อมูลทีม (แหล่งข้อมูลเดียวที่ใช้ตอบเรื่องทีม)
${portfolioToText(portfolio)}

# Task
- ถ้าผู้ใช้ถามเรื่องกลุ่มหรือสมาชิกคนไหน ให้ตอบเฉพาะข้อมูลของคนนั้นหรือกลุ่มนั้น จากหัวข้อ "ข้อมูลทีม" เท่านั้น
- ถ้าผู้ใช้ถามคำถามทั่วไปที่ไม่เกี่ยวกับ Portfolio ให้ตอบได้ตามปกติ

# Response Style
- ${langRule}
- ตอบตรงคำถาม กระชับ โดยทั่วไป 1-4 ประโยค
- ตอบเป็นข้อความธรรมดา ห้ามใช้ Markdown เช่น **ตัวหนา** หรือ # หัวข้อ (หน้าเว็บแสดงเป็นข้อความตรง ๆ)${place}

# Rules
- ห้ามแต่งประวัติ ประสบการณ์ ทักษะ ผลงาน หรือช่องทางติดต่อที่ไม่มีใน "ข้อมูลทีม"
- ห้ามกล่าวว่าโปรเจกต์ใดเสร็จแล้ว หากไม่มีข้อมูลยืนยัน และแยกงานที่เสร็จ กำลังทำ และวางแผนไว้ให้ชัดเจน
- หากไม่ทราบข้อมูลของทีม ให้บอกตรง ๆ ว่าไม่มีข้อมูลยืนยันในส่วนนี้
- ห้ามแต่งลิงก์หรือ URL ขึ้นมาเอง (ใช้ได้เฉพาะลิงก์ที่อยู่ใน "ข้อมูลทีม")
- ถ้าสมาชิกมี "แนวทางการตอบเรื่องคนนี้" ให้ทำตามเมื่อตอบเรื่องคนนั้น
- พูดถึงสมาชิกในบุรุษที่สาม (เช่น "สกายเป็น...") ไม่ใช่ "ผม"

# Output format
ขึ้นต้นคำตอบด้วยแท็กเดียวเสมอ ตามด้วยช่องว่างแล้วจึงตอบ
- [TEAM] ถ้าคำตอบใช้ข้อมูลจาก "ข้อมูลทีม"
- [GENERAL] ถ้าเป็นคำตอบทั่วไปที่ไม่ได้ใช้ข้อมูลทีม`;
}

function extractRelevantSources(portfolio: Portfolio, replyText: string): Source[] {
  const sources: Source[] = [TEAM_SOURCE];
  const seenUrls = new Set<string>();

  const addIfRelevant = (title: string, url: unknown, keywords: string[]) => {
    if (typeof url !== "string" || !url.startsWith("http") || seenUrls.has(url)) return;
    const isMatch = keywords.some((kw) => kw && replyText.toLowerCase().includes(kw.toLowerCase()));
    if (isMatch) {
      seenUrls.add(url);
      sources.push({ title, url });
    }
  };

  for (const m of portfolio.members ?? []) {
    const memberName = String(m.name ?? "");
    const nickname = String(m.nickname ?? "");
    const engName = String(m.englishName ?? "");

    if (m.contact && typeof m.contact === "object" && !Array.isArray(m.contact)) {
      for (const [platform, val] of Object.entries(m.contact)) {
        addIfRelevant(`${memberName || nickname} (${platform})`, val, [memberName, nickname, engName]);
      }
    }

    if (Array.isArray(m.works)) {
      for (const w of m.works) {
        if (w && typeof w === "object" && !Array.isArray(w)) {
          const workTitle = String(w.title ?? "ผลงาน");
          addIfRelevant(workTitle, w.link, [workTitle, memberName, nickname]);
        }
      }
    }
  }

  return sources;
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

  const portfolio = loadPortfolio();
  const raw = await askLlm(buildSystemPrompt(portfolio, language, district), [
    ...history,
    { role: "user", content: text },
  ]);

  const m = raw.match(/^\s*\[(TEAM|GENERAL)\]\s*/i);
  const isTeam = m?.[1].toUpperCase() === "TEAM";
  const cleanText = m ? raw.slice(m[0].length) : raw;

  return {
    text: cleanText,
    sources: isTeam ? extractRelevantSources(portfolio, cleanText) : [],
  };
}