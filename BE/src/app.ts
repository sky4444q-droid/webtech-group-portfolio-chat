import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { getReply, type Language } from "./reply";
import {
  addPair,
  clearMessages,
  deleteMessage,
  initDb,
  listMessages,
  recentMessages,
  updateMessage,
} from "./db";

try {
  process.loadEnvFile();
} catch {
  // ไม่มีไฟล์ .env ก็ไม่เป็นไร
}

const MAX_TEXT = 2000;
const HISTORY_SIZE = 10;

const app = express();

// จำกัดให้เฉพาะโดเมนหน้าเว็บของเรา (ใส่หลายโดเมนคั่นด้วยจุลภาค) ถ้าไม่ตั้งค่าจะเปิดให้ทุกโดเมน
const origins = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors(origins?.length ? { origin: origins } : undefined));
app.use(express.json());

const asyncRoute =
  (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

// sessionId อ่านจาก query (?sessionId=) หรือ body
const sessionOf = (req: express.Request): string | undefined =>
  str(req.query.sessionId) ?? str(req.body?.sessionId);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get(
  "/messages",
  asyncRoute(async (req, res) => {
    const sessionId = sessionOf(req);
    res.json(sessionId ? await listMessages(sessionId) : []);
  }),
);

app.post(
  "/messages",
  asyncRoute(async (req, res) => {
    const userText = str(req.body?.text);

    if (!userText) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    if (userText.length > MAX_TEXT) {
      res.status(400).json({ error: `text must be at most ${MAX_TEXT} characters` });
      return;
    }

    const language: Language = req.body?.language === "en" ? "en" : "th";
    const district = str(req.body?.district);
    const sessionId = sessionOf(req) ?? crypto.randomUUID();

    let reply;
    try {
      const history = (await recentMessages(sessionId, HISTORY_SIZE)).map((m) => ({
        role: m.role,
        content: m.text,
      }));
      reply = await getReply(userText, history, language, district);
    } catch (err) {
      const e = err as { status?: number; message?: string };
      console.error("LLM error:", e.status ?? "-", e.message);

      if (e.status === 429) {
        res.status(429).json({ error: "เรียก AI ถี่เกินโควตา รอสักครู่แล้วลองใหม่" });
      } else {
        res.status(502).json({ error: "เรียก AI ไม่สำเร็จ ตรวจ LLM_API_KEY / LLM_MODEL ใน BE/.env" });
      }
      return;
    }

    const [userMessage, assistantMessage] = await addPair(
      sessionId,
      userText,
      reply.text,
      reply.sources,
    );

    res.status(201).json({
      sessionId,
      userMessage,
      assistantMessage,
      reply: reply.text,
      sources: reply.sources,
    });
  }),
);

app.put(
  "/messages/:id",
  asyncRoute(async (req, res) => {
    const sessionId = sessionOf(req);
    const text = str(req.body?.text);

    if (!sessionId || !text) {
      res.status(400).json({ error: "sessionId and text are required" });
      return;
    }

    const message = await updateMessage(sessionId, Number(req.params.id), text);
    if (!message) {
      res.status(404).json({ error: "message not found" });
      return;
    }
    res.json(message);
  }),
);

app.delete(
  "/messages/:id",
  asyncRoute(async (req, res) => {
    const sessionId = sessionOf(req);
    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }
    if (!(await deleteMessage(sessionId, Number(req.params.id)))) {
      res.status(404).json({ error: "message not found" });
      return;
    }
    res.json({ message: "deleted" });
  }),
);

app.delete(
  "/messages",
  asyncRoute(async (req, res) => {
    const sessionId = sessionOf(req);
    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }
    await clearMessages(sessionId);
    res.json({ message: "cleared" });
  }),
);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => app.listen(PORT, () => console.log(`Server is running on port ${PORT}`)))
  .catch((err) => {
    console.error("เชื่อมต่อฐานข้อมูลไม่สำเร็จ ตรวจ DATABASE_URL:", err.message);
    process.exit(1);
  });
