import { describe, expect, it } from "vitest";
import { portfolioFromApi } from "./fromApi";
import { PENDING, portfolio as fallback } from "./portfolio";

const api = {
  group: { name: null, concept: null, highlights: [], contact: { email: null, github: "https://github.com/team" } },
  members: [
    {
      name: "สมชาย ใจดี",
      nickname: "ชาย",
      role: "Frontend",
      skills: ["React: ทำหน้าเว็บ", "CSS"],
      works: [{ title: "App A", detail: "ทำอะไรบางอย่าง", tools: "React, TypeScript และ Git", link: "https://github.com/x/a" }, "งานเล็ก"],
      contact: "Email: a@b.c | GitHub: https://github.com/chai",
    },
    { name: "สมหญิง", works: [] },
  ],
};

describe("portfolioFromApi", () => {
  const p = portfolioFromApi(api);

  it("keeps NEXORA when backend has no group name", () => {
    expect(p.group.name).toEqual(fallback.group.name);
    expect(p.group.concept).toEqual(PENDING);
    expect(p.group.placeholder).toBe(true);
  });

  it("maps members with nickname, short skills and work titles", () => {
    expect(p.members).toHaveLength(2);
    expect(p.members[0].name.th).toBe("ชาย — สมชาย ใจดี");
    expect(p.members[0].skills.map((s) => s.th)).toEqual(["React", "CSS"]);
    expect(p.members[0].works.map((s) => s.th)).toEqual(["App A", "งานเล็ก"]);
    expect(p.members[1].role).toEqual(PENDING);
  });

  it("shows only the NEXORA project, credited to every member", () => {
    expect(p.projects).toHaveLength(1);
    expect(p.projects[0]).toMatchObject({ id: "project-1", memberIds: ["member-1", "member-2"] });
    expect(p.projects[0].name.en).toBe("NEXORA Virtual Universe");
  });

  it("collects group and member contacts with links", () => {
    expect(p.contacts.map((c) => c.url)).toEqual(["https://github.com/team", "https://github.com/chai"]);
  });

  it("falls back to placeholders on empty data", () => {
    const e = portfolioFromApi({});
    expect(e.members).toBe(fallback.members);
    expect(e.projects).toHaveLength(1);
  });
});

describe("member looks", () => {
  it("attaches photo and colour by the English nickname", () => {
    const p = portfolioFromApi({ members: [{ name: "ก", nickname: "สกาย (Sky)" }, { name: "ข", nickname: "เก้า (Kao)" }, { name: "ค", nickname: "แสตมป์ (Stamp)" }, { name: "ง", nickname: "อื่น" }] });
    expect(p.members.map((m) => m.photo)).toEqual(["/images/member-sky.webp", "/images/member-kao.webp", "/images/member-stamp.webp", null]);
    expect(p.members[0].accent).toBe("#05d9e8");
    expect(p.members[2].icon).toBe("database");
    expect(p.members[3].accent).toBeNull();
  });
});
