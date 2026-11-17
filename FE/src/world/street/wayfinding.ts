// ข้อความป้ายบอกทาง: ชื่อที่ตามภาษาที่เลือก + ลูกศร

import { DISTRICTS } from "../../config/districts";
import type { DistrictId, Lang } from "../../types";

export function wayfindingLabel(target: DistrictId, lang: Lang): string {
  const name = DISTRICTS[target].name[lang] || DISTRICTS[target].name.th;
  return `${name} →`;
}
