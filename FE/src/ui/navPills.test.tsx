import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NavPills } from "./NavPills";
import { initialWorldState, useWorld } from "../store/useWorld";
import { DISTRICTS, NAV_ORDER } from "../config/districts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("NavPills", () => {
  let host: HTMLDivElement;
  let root: Root;
  const buttons = () => [...host.querySelectorAll("button")];

  beforeEach(() => {
    window.localStorage.clear();
    useWorld.setState({ ...initialWorldState(), introDone: true, district: "nexus", lang: "en" });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<NavPills />));
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("renders the four visitable places in order in the selected language (no Gate)", () => {
    expect(NAV_ORDER).not.toContain("gate");
    expect(buttons().map((b) => b.textContent)).toEqual(NAV_ORDER.map((id) => DISTRICTS[id].name.en));
  });

  it("marks the current place", () => {
    const active = buttons().filter((b) => b.getAttribute("aria-current") === "location");
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toBe(DISTRICTS.nexus.name.en);
    expect(active[0].classList.contains("is-active")).toBe(true);
  });

  it("marks the destination during a trip", () => {
    act(() => useWorld.setState({ travel: { from: "nexus", to: "team" } }));
    const active = buttons().find((b) => b.classList.contains("is-active"))!;
    expect(active.textContent).toBe(DISTRICTS.team.name.en);
    expect(active.getAttribute("aria-current")).toBe("location");
  });

  it("travels on click", () => {
    const projects = buttons()[NAV_ORDER.indexOf("projects")];
    act(() => projects.click());
    expect(useWorld.getState().travel?.to).toBe("projects");
  });

  it("does nothing when clicking the current place", () => {
    const here = buttons()[NAV_ORDER.indexOf("nexus")];
    act(() => here.click());
    expect(useWorld.getState().travel).toBeNull();
  });
});
