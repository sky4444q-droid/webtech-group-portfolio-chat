import { describe, expect, it, vi } from "vitest";
import { fetchHistory } from "../services/chatApi";
import { chatDeps, useChat } from "./useChat";

describe("fetchHistory", () => {
  it("แปลงข้อความจาก GET /messages เป็นข้อความแชท", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 1, role: "user", text: "สวัสดี" },
          { id: 2, role: "assistant", text: "สวัสดีครับ", sources: [{ title: "ข้อมูลโปรไฟล์ทีม", url: null }] },
          { id: 3, role: "system", text: "ข้าม" },
        ]),
        { status: 200 },
      ),
    );
    const out = await fetchHistory("abc", { baseUrl: "https://api.test", fetchImpl, mock: false });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.test/messages?sessionId=abc");
    expect(out.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(out[1].sources).toEqual([{ title: "ข้อมูลโปรไฟล์ทีม", url: null }]);
  });

  it("คืน [] เมื่อหลังบ้านล่มหรือคืนค่าผิดรูปแบบ", async () => {
    const down = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await fetchHistory("abc", { fetchImpl: down, mock: false })).toEqual([]);
    const bad = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await fetchHistory("abc", { fetchImpl: bad, mock: false })).toEqual([]);
  });
});

describe("loadHistory", () => {
  it("โหลดประวัติครั้งเดียว และไม่โหลดถ้าไม่มี sessionId", async () => {
    useChat.setState({ messages: [], sessionId: null, mock: false });
    const spy = vi.spyOn(chatDeps, "fetchHistory").mockResolvedValue([
      { id: "db-1", role: "user", text: "เก่า", sources: [] },
    ]);
    await useChat.getState().loadHistory();
    expect(spy).not.toHaveBeenCalled();

    useChat.setState({ sessionId: "s1" });
    await useChat.getState().loadHistory();
    await useChat.getState().loadHistory();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(useChat.getState().messages.map((m) => m.text)).toEqual(["เก่า"]);
  });
});
