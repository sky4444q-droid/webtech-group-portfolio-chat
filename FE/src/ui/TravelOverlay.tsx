// ชั้นภาพทับระหว่างเดินทาง: ปุ่มข้าม (ตัวจิ๋วเดินนำ) และจางดำ (โหมดต่ำ / ลิงก์ตรง)
// ใช้ CSS animation ยาวเท่าการเดินทาง จึงไม่ต้อง render ทุกเฟรม

import { useWorld } from "../store/useWorld";
import { tripDuration } from "../world/travel/tripDurations";
import { useT } from "../i18n";

export function TravelOverlay() {
  const tr = useT();
  const travel = useWorld((s) => s.travel);
  const kind = useWorld((s) => s.travelKind);
  const skipWalk = useWorld((s) => s.skipWalk);
  if (!travel || !kind) return null;

  const style = { "--trip-ms": `${tripDuration(kind, travel.from, travel.to)}ms` } as React.CSSProperties;
  const key = `${travel.from}-${travel.to}`;

  if (kind === "guide") {
    return (
      <button key={key} type="button" className="travel-skip" onClick={skipWalk} style={style}>
        <span>{tr("walkSkip")}</span>
      </button>
    );
  }
  return <div key={key} className="travel-veil travel-fade" style={style} aria-hidden="true" />;
}
