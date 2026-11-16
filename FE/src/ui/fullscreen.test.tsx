import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Fullscreen } from "./Fullscreen";
import { initialWorldState, useWorld } from "../store/useWorld";
import { usePortfolio } from "../store/usePortfolio";
import { portfolio as fallback } from "../data/portfolio";
import { t } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Fullscreen", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    useWorld.setState({ ...initialWorldState(), introDone: true, district: "team" });
    usePortfolio.setState({ data: fallback, source: "fallback" });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("shows 'awaiting data' for a member profile while team data is still the fallback", () => {
    useWorld.setState({ panel: { kind: "member", id: fallback.members[0].id } });
    act(() => root.render(<Fullscreen />));
    expect(host.textContent).toContain(t("th", "pending"));
  });

  it("renders nothing for a member id that does not exist", () => {
    useWorld.setState({ panel: { kind: "member", id: "nobody" } });
    expect(() => act(() => root.render(<Fullscreen />))).not.toThrow();
    expect(host.textContent).toBe("");
  });

  it("shows the architecture steps of the project", () => {
    const project = fallback.projects[0];
    useWorld.setState({ panel: { kind: "architecture", projectId: project.id } });
    act(() => root.render(<Fullscreen />));
    expect(host.querySelectorAll(".arch-step").length).toBeGreaterThan(1);
  });
});
