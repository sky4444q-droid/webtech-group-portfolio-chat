import { beforeEach, describe, expect, it, vi } from "vitest";
import { chatDeps, initialChatState, useChat } from "./useChat";
import { ChatApiError, type sendChat } from "../services/chatApi";

describe("useChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useChat.setState(initialChatState());
  });

  it("send adds the user message and the AI reply with sources", async () => {
    vi.spyOn(chatDeps, "sendChat").mockResolvedValue({
      reply: "hi there",
      sources: [{ title: "Team profile", url: null }],
      sessionId: "s1",
      mock: false,
    });
    await useChat.getState().send("hi");
    const { messages, sessionId, pending } = useChat.getState();
    expect(messages.map((m) => [m.role, m.text])).toEqual([
      ["user", "hi"],
      ["assistant", "hi there"],
    ]);
    expect(messages[1].sources).toEqual([{ title: "Team profile", url: null }]);
    expect(sessionId).toBe("s1");
    expect(pending).toBe(false);
  });

  it("an API error becomes an assistant message flagged as error", async () => {
    vi.spyOn(chatDeps, "sendChat").mockRejectedValue(new ChatApiError("network", "down"));
    await useChat.getState().send("hi");
    const last = useChat.getState().messages.at(-1)!;
    expect(last.role).toBe("assistant");
    expect(last.error).toBe(true);
  });

  it("retry resends the last user message and replaces the error", async () => {
    const spy = vi
      .spyOn(chatDeps, "sendChat")
      .mockRejectedValueOnce(new ChatApiError("timeout", "slow"))
      .mockResolvedValueOnce({ reply: "ok", sources: [], sessionId: null, mock: false });
    await useChat.getState().send("question");
    await useChat.getState().retry();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0].text).toBe("question");
    expect(useChat.getState().messages.map((m) => m.text)).toEqual(["question", "ok"]);
  });

  it("ignores blank text", async () => {
    const spy = vi.spyOn(chatDeps, "sendChat");
    await useChat.getState().send("   ");
    expect(spy).not.toHaveBeenCalled();
    expect(useChat.getState().messages).toEqual([]);
  });

  it("ignores a second send while waiting", async () => {
    let resolve!: (v: Awaited<ReturnType<typeof sendChat>>) => void;
    const spy = vi.spyOn(chatDeps, "sendChat").mockReturnValue(new Promise((r) => (resolve = r)));
    const first = useChat.getState().send("one");
    await useChat.getState().send("two");
    expect(spy).toHaveBeenCalledTimes(1);
    resolve({ reply: "r", sources: [], sessionId: null, mock: false });
    await first;
  });
});
