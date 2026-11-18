// คำแนะนำการใช้เมาส์มุมซ้ายล่าง — จางหายหลัง HINT_MS และโผล่อีกครั้งเมื่อถึงที่ใหม่

import { useEffect, useState } from "react";
import { useWorld } from "../store/useWorld";
import { useT } from "../i18n";

export const HINT_MS = 6000;

export function ControlHint() {
  const tr = useT();
  const district = useWorld((s) => s.district);
  const travel = useWorld((s) => s.travel);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    if (travel) return;
    setShown(true);
    const id = window.setTimeout(() => setShown(false), HINT_MS);
    return () => window.clearTimeout(id);
  }, [district, travel]);

  return (
    <div className={`control-hint ${shown && !travel ? "is-shown" : ""}`} aria-hidden={!shown}>
      <span className="control-hint-key">{tr("hintClickKey")}</span>
      {tr("hintClick")}
      <span className="control-hint-key">{tr("hintRightKey")}</span>
      {tr("hintRight")}
      <span className="control-hint-key">{tr("hintMoveKey")}</span>
      {tr("hintMove")}
    </div>
  );
}
