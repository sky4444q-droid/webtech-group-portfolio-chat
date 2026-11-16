// แปลงข้อมูลจากหลังบ้าน (GET /portfolio = BE/data/portfolio.json) ให้เป็นรูปแบบที่หน้าเว็บใช้
// ข้อมูลในไฟล์เป็นภาษาไทยอย่างเดียว จึงใช้ข้อความเดียวกันทั้ง TH/EN (ไม่แปลเอง เพื่อไม่แต่งข้อมูล)
// ช่องที่ไม่มีข้อมูล → "รอข้อมูล"

import type { Contact, Localized, Member, Portfolio, Project } from "../types";
import { NEXORA_PROJECT, PENDING, portfolio as fallback } from "./portfolio";

interface ApiWork {
  title?: string | null;
}

interface ApiMember {
  name?: string | null;
  nickname?: string | null;
  role?: string | null;
  skills?: string[];
  works?: (ApiWork | string)[];
  contact?: string | null;
}

export interface ApiPortfolio {
  group?: {
    name?: string | null;
    concept?: string | null;
    highlights?: string[];
    contact?: Record<string, string | null>;
  };
  members?: ApiMember[];
}

const same = (s: string): Localized => ({ th: s, en: s });
const has = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
const text = (s: string | null | undefined): Localized => (has(s) ? same(s.trim()) : PENDING);
const list = (xs: string[] | undefined): Localized[] => {
  const out = (xs ?? []).filter(has).map((x) => same(x.trim()));
  return out.length ? out : [PENDING];
};

/** ตัดคำอธิบายหลัง ":" ออก เช่น "Python: พื้นฐาน..." → "Python" */
const shortSkill = (s: string) => s.split(":")[0].trim();

const firstUrl = (s: string): string | null => s.match(/https?:\/\/[^\s|,]+/)?.[0] ?? null;


const displayName = (m: ApiMember) => [m.nickname, m.name].filter(has).join(" — ");

export function portfolioFromApi(api: ApiPortfolio): Portfolio {
  const apiMembers = (api.members ?? []).filter((m) => has(m.name) || has(m.nickname));

  const members: Member[] = apiMembers.map((m, i) => ({
    id: `member-${i + 1}`,
    placeholder: false,
    name: same(displayName(m)),
    role: text(m.role),
    skills: list((m.skills ?? []).filter(has).map(shortSkill)),
    works: list((m.works ?? []).map((w) => (typeof w === "string" ? w : (w?.title ?? ""))).filter(has)),
    photo: null,
  }));

  // แสดงผลงานชิ้นเดียว: เว็บนี้ ทุกคนในทีมเป็นผู้ร่วมทำ
  const projects: Project[] = [{ ...NEXORA_PROJECT, memberIds: members.map((m) => m.id) }];

  const contacts: Contact[] = [];
  for (const [key, value] of Object.entries(api.group?.contact ?? {})) {
    if (has(value)) contacts.push({ id: `group-${key}`, placeholder: false, label: same(key), value: same(value), url: firstUrl(value) });
  }
  apiMembers.forEach((m, i) => {
    if (!has(m.contact)) return;
    contacts.push({
      id: `member-contact-${i + 1}`,
      placeholder: false,
      label: same([m.nickname, m.name].filter(has)[0] ?? ""),
      value: same(m.contact.trim()),
      url: firstUrl(m.contact),
    });
  });

  const g = api.group ?? {};
  const groupHasData = has(g.concept) || (g.highlights ?? []).some(has);
  return {
    group: {
      ...fallback.group,
      // ชื่อ NEXORA และโลโก้ยืนยันแล้วฝั่งหน้าเว็บ ถ้าหลังบ้านใส่ชื่อมาจะใช้ของหลังบ้าน
      name: has(g.name) ? same(g.name) : fallback.group.name,
      placeholder: !groupHasData,
      concept: text(g.concept),
      highlights: list(g.highlights),
    },
    members: members.length ? members : fallback.members,
    projects,
    contacts: contacts.length ? contacts : fallback.contacts,
  };
}
