// ชั้นภาพทับระหว่างเดินทาง: จางดำ (ลิฟต์/จาง), อุโมงค์แสง (Portal), ปุ่มข้ามการเดิน (Gallery Avenue)
// ใช้ CSS animation ยาวเท่าการเดินทาง จึงไม่ต้อง render ทุกเฟรม

import { useWorld } from "../store/useWorld";
import { walkPath } from "../world/travel/paths";
import { tripDuration } from "../world/travel/tripDurations";
import { useT } from "../i18n";

export function TravelOverlay() {
  const tr = useT();
  const travel = useWorld((s) => s.travel);
  const kind = useWorld((s) => s.travelKind);
  const skipWalk = useWorld((s) => s.skipWalk);
  if (!travel || !kind || kind === "fly") return null;

  const pre = kind === "walk" && !!walkPath(travel.from, travel.to).pre;
  const style = { "--trip-ms": `${tripDuration(kind, pre)}ms` } as React.CSSProperties;
  const key = `${travel.from}-${travel.to}`;

  if (kind === "walk") {
    return (
      <button key={key} type="button" className="travel-skip" onClick={skipWalk} style={style}>
        <span>{tr("walkSkip")}</span>
      </button>
    );
  }
  return <div key={key} className={`travel-veil travel-${kind}`} style={style} aria-hidden="true" />;
}
