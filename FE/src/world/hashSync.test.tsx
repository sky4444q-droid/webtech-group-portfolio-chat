import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useHashSync } from "./useHashSync";
import { initialWorldState, useWorld } from "../store/useWorld";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  useHashSync();
  return null;
}

/** history.back() ใน jsdom ทำงานแบบไม่พร้อมกัน — รอ hashchange */
const back = () =>
  new Promise<void>((resolve) => {
    window.addEventListener("hashchange", () => resolve(), { once: true });
    window.history.back();
  });

describe("useHashSync", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "#/sanctuary");
    window.history.pushState(null, "", "#/team");
    useWorld.setState({ ...initialWorldState(), introDone: true, district: "team", travelKind: null });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<Probe />));
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("keeps Back meaning 'go back' after pressing it during a trip", async () => {
    // team → nexus (มาถึง: URL เพิ่ม #/nexus)
    act(() => useWorld.getState().travelTo("nexus"));
    act(() => useWorld.getState().finishTravel());
    expect(window.location.hash).toBe("#/nexus");

    // กดแคปซูลไป projects แล้วกด Back ระหว่างทาง → URL กลับเป็น #/team และจองคิวไว้
    act(() => useWorld.getState().travelTo("projects"));
    await act(back);
    expect(window.location.hash).toBe("#/team");
    expect(useWorld.getState().queuedTarget).toBe("team");

    // ถึง projects แล้วเดินต่อไป team ตามคิว
    act(() => useWorld.getState().finishTravel());
    expect(useWorld.getState().travel?.to).toBe("team");
    act(() => useWorld.getState().finishTravel());
    expect(useWorld.getState().district).toBe("team");
    expect(window.location.hash).toBe("#/team");

    // Back อีกครั้งต้องย้อนไปก่อนหน้า team (sanctuary) ไม่ใช่ projects ที่ผู้ชมเพิ่งหนีออกมา
    await act(back);
    expect(window.location.hash).toBe("#/sanctuary");
  });
});
