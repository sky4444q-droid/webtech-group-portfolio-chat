import { th } from "./th";
import { en } from "./en";
import type { Lang, Localized } from "../types";
import { useWorld } from "../store/useWorld";

export type Dict = typeof th;
export type DictKey = keyof Dict;

const dicts: Record<Lang, Record<DictKey, string>> = { th, en };

/** แปลข้อความหน้าเว็บตาม key */
export function t(lang: Lang, key: DictKey): string {
  return dicts[lang][key] ?? dicts.th[key];
}

/** เลือกภาษาจากข้อมูลที่มีทั้งไทยและอังกฤษ */
export function pick(lang: Lang, value: Localized): string {
  return value[lang] || value.th;
}

/** Hook สำหรับ component: const tr = useT(); tr("close") */
export function useT(): (key: DictKey) => string {
  const lang = useWorld((s) => s.lang);
  return (key) => t(lang, key);
}

/** Hook: const p = usePick(); p(project.name) */
export function usePick(): (value: Localized) => string {
  const lang = useWorld((s) => s.lang);
  return (value) => pick(lang, value);
}
