// สถานะแชท: รายการข้อความของการเข้าชมครั้งนี้ + การส่งข้อความไปหลังบ้าน

import { create } from "zustand";
import type { ChatMessage } from "../types";
import { ChatApiError, fetchHistory, sendChat, WAKING_NOTICE_MS, type ChatErrorKind, isMockMode } from "../services/chatApi";
import { useWorld } from "./useWorld";
import { useAi } from "./useAi";
import * as sfx from "../audio/sfx";
import { load, save } from "../lib/storage";
import type { DictKey } from "../i18n";

/** แยกไว้เพื่อให้ test แทนที่การเรียกหลังบ้านได้ */
export const chatDeps = { sendChat, fetchHistory };

const ERROR_KEYS: Record<ChatErrorKind, DictKey> = {
  rate_limit: "chatErrRate",
  server: "chatErrServer",
  network: "chatErrNetwork",
  timeout: "chatErrTimeout",
  bad_response: "chatErrBad",
};

export interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  pending: boolean;
  /** รอนานจนต้องบอกว่ากำลังปลุกระบบ */
  waking: boolean;
  mock: boolean;
  send: (text: string) => Promise<void>;
  /** โหลดประวัติแชทเดิมจากฐานข้อมูลครั้งแรกที่เปิดแชท (ถ้ามี sessionId จากครั้งก่อน) */
  loadHistory: () => Promise<void>;
  retry: () => Promise<void>;
}

type ChatData = Pick<ChatState, "messages" | "sessionId" | "pending" | "waking" | "mock">;

export function initialChatState(): ChatData {
  return {
    messages: [],
    sessionId: load<string | null>("sessionId", null),
    pending: false,
    waking: false,
    mock: isMockMode(),
  };
}

let nextId = 0;
const newId = () => `m${Date.now().toString(36)}-${nextId++}`;

export const useChat = create<ChatState>((set, get) => {
  async function request(text: string) {
    const { lang, district } = useWorld.getState();
    set({ pending: true, waking: false });
    useAi.getState().setMood("thinking");
    const wakeTimer = setTimeout(() => {
      if (get().pending) set({ waking: true });
    }, WAKING_NOTICE_MS);

    try {
      const result = await chatDeps.sendChat({
        text,
        sessionId: get().sessionId,
        language: lang,
        district,
      });
      if (result.sessionId && result.sessionId !== get().sessionId) {
        save("sessionId", result.sessionId);
      }
      set((s) => ({
        sessionId: result.sessionId ?? s.sessionId,
        mock: result.mock,
        messages: [...s.messages, { id: newId(), role: "assistant", text: result.reply, sources: result.sources }],
      }));
      useAi.getState().setMood("happy", 1600);
      sfx.play("reply");
    } catch (err) {
      const kind: ChatErrorKind = err instanceof ChatApiError ? err.kind : "server";
      // ข้อความ error เก็บเป็น key ของคำแปล เพื่อให้เปลี่ยนภาษาตามผู้ใช้ได้
      set((s) => ({
        messages: [...s.messages, { id: newId(), role: "assistant", text: ERROR_KEYS[kind], sources: [], error: true }],
      }));
      useAi.getState().setMood("error", 1800);
    } finally {
      clearTimeout(wakeTimer);
      set({ pending: false, waking: false });
    }
  }

  let historyLoaded = false;

  return {
    ...initialChatState(),

    loadHistory: async () => {
      const { sessionId, mock } = get();
      if (historyLoaded || mock || !sessionId) return;
      historyLoaded = true;
      const history = await chatDeps.fetchHistory(sessionId);
      // ถ้าผู้ใช้เริ่มพิมพ์ไปก่อนประวัติโหลดเสร็จ ให้เอาประวัติไว้ข้างหน้า
      if (history.length) set((s) => ({ messages: [...history, ...s.messages] }));
    },

    send: async (raw) => {
      const text = raw.trim();
      if (!text || get().pending) return;
      set((s) => ({ messages: [...s.messages, { id: newId(), role: "user", text, sources: [] }] }));
      sfx.play("send");
      await request(text);
    },

    retry: async () => {
      const { messages, pending } = get();
      if (pending) return;
      const last = messages.at(-1);
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (!last?.error || !lastUser) return;
      set({ messages: messages.slice(0, -1) });
      await request(lastUser.text);
    },
  };
});
