// การเปิดดูแบบเต็มจอ: ผลงานครบทุกช่อง, ข้อมูลทีม, โปรไฟล์สมาชิกรายคน, ไดอะแกรม Architecture
// ฉากด้านหลังมืดและเบลอลง ปิดด้วย Esc หรือปุ่ม ✕

import type { CSSProperties } from "react";
import { useWorld } from "../store/useWorld";
import { usePortfolio } from "../store/usePortfolio";
import { usePick, useT } from "../i18n";
import { parseArchitecture } from "../lib/architecture";
import { ProjectPanel, Shell, TeamPanel } from "./Panels";
import { PendingBadge, Text } from "./Pending";

export function Fullscreen() {
  const panel = useWorld((s) => s.panel);
  let body: React.ReactNode = null;
  if (panel?.kind === "project" && panel.display === "full") body = <ProjectPanel id={panel.id} />;
  else if (panel?.kind === "team" && panel.display === "full") body = <TeamPanel />;
  else if (panel?.kind === "member") body = <MemberProfile id={panel.id} />;
  else if (panel?.kind === "architecture") body = <ArchitectureDiagram projectId={panel.projectId} />;
  if (!body) return null;
  return <div className="fullscreen">{body}</div>;
}

function MemberProfile({ id }: { id: string }) {
  const tr = useT();
  const p = usePick();
  const member = usePortfolio((s) => s.data.members.find((m) => m.id === id));
  if (!member) return null;
  const ph = member.placeholder;
  return (
    <Shell kicker={tr("memberProfile")} title={p(member.name)}>
      <div className="member-profile">
        <div className={`member-photo member-photo-large${member.photo ? " holo-photo" : ""}`} style={member.accent ? ({ "--accent": member.accent } as CSSProperties) : undefined}>
          {member.photo ? <img src={member.photo} alt={p(member.name)} /> : <span className="member-silhouette" aria-hidden="true" />}
        </div>
        <div>
          <h3>{tr("memberRole")}</h3>
          <p>
            <Text value={member.role} placeholder={ph} />
          </p>
          <h3>{tr("memberSkills")}</h3>
          <ul className="chips">
            {member.skills.map((s, i) => (
              <li key={i}>
                <Text value={s} placeholder={ph} />
              </li>
            ))}
          </ul>
          <h3>{tr("memberWorks")}</h3>
          <ul className="panel-list">
            {member.works.map((w, i) => (
              <li key={i}>
                <Text value={w} placeholder={ph} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Shell>
  );
}

function ArchitectureDiagram({ projectId }: { projectId: string }) {
  const tr = useT();
  const p = usePick();
  const project = usePortfolio((s) => s.data.projects.find((x) => x.id === projectId));
  if (!project) return null;
  const steps = parseArchitecture(p(project.architecture));
  return (
    <Shell kicker={p(project.name)} title={tr("archTitle")}>
      {steps.length > 1 ? (
        <ol className="arch">
          {steps.map((step, i) => (
            <li key={i} className="arch-step" style={{ animationDelay: `${i * 0.12}s` }}>
              <span className="arch-index">{String(i + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      ) : steps.length === 1 ? (
        <p>{steps[0]}</p>
      ) : (
        <PendingBadge />
      )}
    </Shell>
  );
}
