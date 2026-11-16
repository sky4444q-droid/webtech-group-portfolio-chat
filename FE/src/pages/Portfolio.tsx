import { useEffect, useState } from 'react';
import { fetchPortfolio } from '../api';
import type { Portfolio as PortfolioData } from '../types';

export default function Portfolio() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchPortfolio().then(setData).catch(() => setFailed(true));
  }, []);

  if (failed) return <section className="portfolio"><p>โหลดข้อมูลทีมไม่สำเร็จ</p></section>;
  if (!data) return <section className="portfolio"><p>กำลังโหลด...</p></section>;

  const g = data.group ?? {};
  const contacts = Object.entries(g.contact ?? {}).filter(([, v]) => v);

  return (
    <section className="portfolio">
      <h2>{g.name || 'Portfolio ของกลุ่ม'}</h2>
      {g.concept && <p>{g.concept}</p>}

      {!!g.highlights?.length && (
        <>
          <h3>จุดเด่น</h3>
          <ul>{g.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
        </>
      )}
      {!!g.sharedWorks?.length && (
        <>
          <h3>ผลงานร่วมกัน</h3>
          <ul>{g.sharedWorks.map((w) => <li key={w}>{w}</li>)}</ul>
        </>
      )}

      <h3>สมาชิก</h3>
      <div className="member-grid">
        {(data.members ?? []).filter((m) => m.name).map((m) => (
          <article className="member-card" key={m.name}>
            <h4>
              {m.name}
              {m.nickname && <span className="member-nick"> · {m.nickname}</span>}
            </h4>
            {m.role && <p className="member-role">{m.role}</p>}
            {m.education && <p>{m.education}</p>}
            {m.interestedPosition && <p>สนใจ: {m.interestedPosition}</p>}
            {m.intro && <p className="member-intro">{m.intro}</p>}
            {!!m.skills?.length && (
              <p>ทักษะ: {m.skills.map((s) => s.split(':')[0]).join(', ')}</p>
            )}
            {!!m.works?.length && (
              <div>
                ผลงาน:
                <ul>
                  {m.works.map((w, i) => {
                    const work = typeof w === 'string' ? { title: w } : w;
                    return (
                      <li key={i}>
                        {work.link ? (
                          <a href={work.link} target="_blank" rel="noreferrer">{work.title}</a>
                        ) : (
                          work.title
                        )}
                        {work.status && ` (${work.status})`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {m.contact && <p>ติดต่อ: {m.contact}</p>}
          </article>
        ))}
      </div>

      {contacts.length > 0 && (
        <>
          <h3>ติดต่อกลุ่ม</h3>
          <ul>{contacts.map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
        </>
      )}
    </section>
  );
}
