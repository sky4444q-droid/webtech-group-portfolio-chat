// ชนิดข้อมูลกลางของหน้าเว็บ — ใช้ร่วมกันทุกไฟล์

export type Lang = "th" | "en";

/** ข้อความที่มีทั้งภาษาไทยและอังกฤษ */
export interface Localized {
  th: string;
  en: string;
}

export type DistrictId = "gate" | "nexus" | "projects" | "team" | "sanctuary";

/** ร่างของ AI ในแต่ละพื้นที่ */
export type AiForm = "orb" | "geometric" | "fluid";

// ---------- ข้อมูล Portfolio ----------
// placeholder: true = ยังไม่มีข้อมูลจริง หน้าเว็บจะแสดงป้าย "รอข้อมูล"

export interface Group {
  placeholder: boolean;
  name: Localized;
  /** path รูปโลโก้ใน public/ */
  logo: string | null;
  concept: Localized;
  highlights: Localized[];
}

export interface Member {
  id: string;
  placeholder: boolean;
  name: Localized;
  role: Localized;
  skills: Localized[];
  works: Localized[];
  /** path รูปใน public/images เช่น "/images/member-1.jpg" */
  photo: string | null;
  /** สีประจำตัว (โฮโลแกรม) — null = ใช้สีเขต */
  accent: string | null;
  /** สัญลักษณ์งาน — null = ไม่แสดง */
  icon: "cloud" | "code" | "database" | null;
}

export interface Project {
  id: string;
  placeholder: boolean;
  name: Localized;
  summary: Localized;
  problem: Localized;
  features: Localized[];
  techStack: string[];
  architecture: Localized;
  images: string[];
  demoUrl: string | null;
  githubUrl: string | null;
  memberIds: string[];
}

export interface Contact {
  id: string;
  placeholder: boolean;
  label: Localized;
  value: Localized;
  url: string | null;
}

export interface Portfolio {
  group: Group;
  members: Member[];
  projects: Project[];
  contacts: Contact[];
}

// ---------- แชท ----------

export interface ChatSource {
  title: string;
  url: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources: ChatSource[];
  error?: boolean;
}

/** สิ่งที่หน้าเว็บส่งไปหาหลังบ้าน */
export interface ChatRequest {
  text: string;
  sessionId: string | null;
  language: Lang;
  district: DistrictId;
}

/** คำตอบที่หน้าเว็บใช้ (แปลงมาจากรูปแบบของหลังบ้านแล้ว) */
export interface ChatResult {
  sessionId: string | null;
  reply: string;
  sources: ChatSource[];
  mock: boolean;
}
