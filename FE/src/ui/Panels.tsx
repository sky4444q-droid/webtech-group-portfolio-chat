// Panel ข้อมูล: ผลงาน, ทีม, ช่องทางติดต่อ — ข้อมูลมาจาก src/data/portfolio.ts

import type { CSSProperties } from "react";
import { useWorld } from "../store/useWorld";
import { usePortfolio } from "../store/usePortfolio";
import { usePick, useT } from "../i18n";
import type { Localized } from "../types";
import { MaybeLink, PendingBadge, Text } from "./Pending";

export function Panels() {
  const panel = useWorld((s) => s.panel);
  // ช่องทางติดต่อเป็น Panel ข้าง · ผลงาน/ทีมแบบเต็มจออยู่ที่ Fullscreen · Hologram อยู่ในฉาก
  if (panel?.kind !== "contact") return null;
  return <ContactPanel />;
}

export function Shell({ title, kicker, placeholder, children }: { title: React.ReactNode; kicker: string; placeholder?: boolean; children: React.ReactNode }) {
  const tr = useT();
  const closePanel = useWorld((s) => s.closePanel);
  return (
    <section className="panel" role="dialog" aria-modal="false" aria-label={typeof title === "string" ? title : kicker}>
      <header className="panel-header">
        <div>
          <span className="panel-kicker">{kicker}</span>
          <h2 className="panel-title">
            {title}
            {placeholder && <PendingBadge />}
          </h2>
        </div>
        <button type="button" className="icon-btn" onClick={closePanel} aria-label={tr("close")}>
          ✕
        </button>
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function List({ items, placeholder }: { items: Localized[]; placeholder: boolean }) {
  return (
    <ul className="panel-list">
      {items.map((it, i) => (
        <li key={i}>
          <Text value={it} placeholder={placeholder} />
        </li>
      ))}
    </ul>
  );
}

export function ProjectPanel({ id }: { id: string }) {
  const tr = useT();
  const p = usePick();
  const portfolio = usePortfolio((s) => s.data);
  const index = portfolio.projects.findIndex((x) => x.id === id);
  const project = portfolio.projects[index];
  if (!project) return null;
  const ph = project.placeholder;
  const members = portfolio.members.filter((m) => project.memberIds.includes(m.id));

  return (
    <Shell kicker={`PROJECT ${String(index + 1).padStart(2, "0")}`} title={p(project.name)}>
      <h3>{tr("projectSummary")}</h3>
      <p>
        <Text value={project.summary} placeholder={ph} />
      </p>
      <h3>{tr("projectProblem")}</h3>
      <p>
        <Text value={project.problem} placeholder={ph} />
      </p>
      <h3>{tr("projectFeatures")}</h3>
      <List items={project.features} placeholder={ph} />
      <h3>{tr("projectTech")}</h3>
      {project.techStack.length ? (
        <ul className="chips">
          {project.techStack.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : (
        <PendingBadge />
      )}
      <h3>{tr("projectArch")}</h3>
      <p>
        <Text value={project.architecture} placeholder={ph} />
      </p>
      <h3>{tr("projectImages")}</h3>
      {project.images.length ? (
        <div className="gallery">
          {project.images.map((src) => (
            <img key={src} src={src} alt={p(project.name)} loading="lazy" />
          ))}
        </div>
      ) : (
        <div className="image-placeholder">
          <PendingBadge />
        </div>
      )}
      <h3>{tr("projectMembers")}</h3>
      {members.length ? <p>{members.map((m) => p(m.name)).join(", ")}</p> : <PendingBadge />}
      <div className="panel-links">
        <MaybeLink href={project.demoUrl}>{tr("projectDemo")}</MaybeLink>
        <MaybeLink href={project.githubUrl}>{tr("projectGithub")}</MaybeLink>
        <button type="button" className="btn" onClick={() => useWorld.getState().openPanel({ kind: "architecture", projectId: project.id })}>
          {tr("projectArchView")}
        </button>
      </div>
    </Shell>
  );
}

export function TeamPanel() {
  const tr = useT();
  const p = usePick();
  const { group, members } = usePortfolio((s) => s.data);
  return (
    <Shell kicker={tr("teamTitle")} title={p(group.name)}>
      <h3>{tr("teamConcept")}</h3>
      <p>
        <Text value={group.concept} placeholder={group.placeholder} />
      </p>
      <h3>{tr("teamHighlights")}</h3>
      <List items={group.highlights} placeholder={group.placeholder} />
      <h3>{tr("teamMembers")}</h3>
      <div className="members">
        {members.map((m) => (
          <article
            key={m.id}
            className="member member-clickable"
            role="button"
            tabIndex={0}
            onClick={() => useWorld.getState().openPanel({ kind: "member", id: m.id })}
            onKeyDown={(e) => {
              if (e.key === "Enter") useWorld.getState().openPanel({ kind: "member", id: m.id });
            }}
          >
            <div className={`member-photo${m.photo ? " holo-photo" : ""}`} style={m.accent ? ({ "--accent": m.accent } as CSSProperties) : undefined}>
              {m.photo ? <img src={m.photo} alt={p(m.name)} /> : <span className="member-silhouette" aria-hidden="true" />}
            </div>
            <div className="member-info">
              <h4>{p(m.name)}</h4>
              <dl>
                <dt>{tr("memberRole")}</dt>
                <dd>
                  <Text value={m.role} placeholder={m.placeholder} />
                </dd>
                <dt>{tr("memberSkills")}</dt>
                <dd>
                  {m.skills.map((s, i) => (
                    <span key={i} className="inline-item">
                      <Text value={s} placeholder={m.placeholder} />
                    </span>
                  ))}
                </dd>
                <dt>{tr("memberWorks")}</dt>
                <dd>
                  {m.works.map((w, i) => (
                    <span key={i} className="inline-item">
                      <Text value={w} placeholder={m.placeholder} />
                    </span>
                  ))}
                </dd>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}

function ContactPanel() {
  const tr = useT();
  const p = usePick();
  const portfolio = usePortfolio((s) => s.data);
  return (
    <Shell kicker="CONTACT" title={tr("contactTitle")}>
      <ul className="contacts">
        {portfolio.contacts.map((c) => (
          <li key={c.id}>
            <span className="contact-label">{p(c.label)}</span>
            {c.url ? (
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                {p(c.value)}
              </a>
            ) : (
              <span>
                <Text value={c.value} placeholder={c.placeholder} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </Shell>
  );
}
