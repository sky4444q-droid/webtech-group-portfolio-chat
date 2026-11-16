// Mini Map / District Navigator — แผนผัง Hub 5 จุด คลิกเพื่อเดินทาง

import { DISTRICT_ORDER, DISTRICTS, isLinked } from "../config/districts";
import { useWorld } from "../store/useWorld";
import { usePick, useT } from "../i18n";

export function MiniMap() {
  const tr = useT();
  const p = usePick();
  const district = useWorld((s) => s.district);
  const travel = useWorld((s) => s.travel);
  const travelTo = useWorld((s) => s.travelTo);

  const links = DISTRICT_ORDER.flatMap((a, i) =>
    DISTRICT_ORDER.slice(i + 1)
      .filter((b) => isLinked(a, b))
      .map((b) => [a, b] as const),
  );

  return (
    <nav className="minimap" aria-label={tr("map")}>
      <span className="minimap-title">{tr("map")}</span>
      <svg viewBox="0 0 100 100" className="minimap-svg" role="presentation">
        {links.map(([a, b]) => {
          const active = travel && ((travel.from === a && travel.to === b) || (travel.from === b && travel.to === a));
          return (
            <line
              key={`${a}-${b}`}
              x1={DISTRICTS[a].map[0]}
              y1={DISTRICTS[a].map[1]}
              x2={DISTRICTS[b].map[0]}
              y2={DISTRICTS[b].map[1]}
              className={`minimap-link ${active ? "is-active" : ""}`}
            />
          );
        })}
      </svg>
      {DISTRICT_ORDER.map((id) => {
        const cfg = DISTRICTS[id];
        const here = id === district && !travel;
        const going = travel?.to === id;
        return (
          <button
            key={id}
            type="button"
            className={`minimap-node ${here ? "is-here" : ""} ${going ? "is-going" : ""}`}
            style={{ left: `${cfg.map[0]}%`, top: `${cfg.map[1]}%`, "--accent": cfg.color } as React.CSSProperties}
            onClick={() => travelTo(id)}
            disabled={!!travel || here}
            aria-current={here ? "location" : undefined}
            title={p(cfg.name)}
          >
            <span className="minimap-dot" />
            <span className="minimap-label">{cfg.short}</span>
          </button>
        );
      })}
    </nav>
  );
}
