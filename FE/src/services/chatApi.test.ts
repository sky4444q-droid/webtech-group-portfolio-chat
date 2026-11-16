import { describe, expect, it, vi } from "vitest";
import { ChatApiError, sendChat } from "./chatApi";
import type { ChatRequest } from "../types";

const req: ChatRequest = {
  text: "hello",
  sessionId: "s0",
  language: "th",
  district: "nexus",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sendChat — mock mode", () => {
  it("answers locally when mock mode is on", async () => {
    const result = await sendChat(req, { mock: true, mockDelayMs: 0 });
    expect(result.mock).toBe(true);
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThanOrEqual(1);
  });
});

describe("sendChat — real backend", () => {
  it("reads the existing backend shape (no sources, no sessionId)", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(201, {
        userMessage: { id: 1, role: "user", text: "hello" },
        assistantMessage: { id: 2, role: "assistant", text: "สวัสดี" },
      }),
    );
    const result = await sendChat(req, { mock: false, baseUrl: "http://api.test/", fetchImpl });
    expect(result).toEqual({ reply: "สวัสดี", sources: [], sessionId: null, mock: false });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/messages");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      text: "hello",
      sessionId: "s0",
      language: "th",
      district: "nexus",
    });
  });

  it("keeps only well-formed sources and returns the sessionId", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(201, {
        sessionId: "s1",
        assistantMessage: { text: "ok" },
        sources: [{ title: "A", url: null }, { bad: 1 }, { title: "B", url: "https://b.test" }],
      }),
    );
    const result = await sendChat(req, { mock: false, baseUrl: "http://api.test", fetchImpl });
    expect(result.sessionId).toBe("s1");
    expect(result.sources).toEqual([
      { title: "A", url: null },
      { title: "B", url: "https://b.test" },
    ]);
  });

  it("maps 429 to rate_limit", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(429, { error: "slow down" }));
    await expect(sendChat(req, { mock: false, baseUrl: "http://api.test", fetchImpl })).rejects.toMatchObject({
      kind: "rate_limit",
    });
  });

  it("maps 502 to server and keeps the backend error message", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(502, { error: "LLM failed" }));
    const err = await sendChat(req, { mock: false, baseUrl: "http://api.test", fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(ChatApiError);
    expect(err.kind).toBe("server");
    expect(err.message).toBe("LLM failed");
  });

  it("maps a thrown TypeError to network", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(sendChat(req, { mock: false, baseUrl: "http://api.test", fetchImpl })).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("maps a timeout to timeout", async () => {
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation timed out.", "TimeoutError")),
          );
        }),
    );
    await expect(
      sendChat(req, { mock: false, baseUrl: "http://api.test", fetchImpl, timeoutMs: 10 }),
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  it("maps a body without assistantMessage.text to bad_response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(201, { hello: "world" }));
    await expect(sendChat(req, { mock: false, baseUrl: "http://api.test", fetchImpl })).rejects.toMatchObject({
      kind: "bad_response",
    });
  });
});
