import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Intro } from "./Intro";
import { Hud } from "./Hud";
import { initialWorldState, useWorld } from "../store/useWorld";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("brand lockup", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    useWorld.setState(initialWorldState());
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("wraps the intro logo and wordmark title in .intro-lockup", () => {
    act(() => root.render(<Intro />));
    const lockup = host.querySelector(".intro-lockup");
    expect(lockup).not.toBeNull();
    expect(lockup!.querySelector("img.intro-logo")).not.toBeNull();
    expect(lockup!.querySelector("h1.intro-title.brand-wordmark")).not.toBeNull();
  });

  it("uses the shared wordmark for the HUD brand name", () => {
    useWorld.setState({ introDone: true });
    act(() => root.render(<Hud />));
    expect(host.querySelector(".hud-brand-name.brand-wordmark")).not.toBeNull();
  });
});
