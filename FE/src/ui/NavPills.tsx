// แถบเมนูแคปซูลด้านบน (แทน Mini Map): ที่ที่ไปได้ทั้งสี่ (Gate เป็นแค่ฉาก Intro) · ที่อยู่ปัจจุบัน/ปลายทางเป็นแคปซูลแดงทึบ

import { DISTRICTS, NAV_ORDER } from "../config/districts";
import { useWorld } from "../store/useWorld";
import { usePick, useT } from "../i18n";

export function NavPills() {
  const tr = useT();
  const p = usePick();
  const district = useWorld((s) => s.district);
  const travel = useWorld((s) => s.travel);
  const travelTo = useWorld((s) => s.travelTo);
  const active = travel?.to ?? district;

  return (
    <nav className="nav-pills" aria-label={tr("map")}>
      {NAV_ORDER.map((id) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            className={`nav-pill ${on ? "is-active" : ""}`}
            aria-current={on ? "location" : undefined}
            onClick={() => {
              if (!on) travelTo(id);
            }}
          >
            {p(DISTRICTS[id].name)}
          </button>
        );
      })}
    </nav>
  );
}
