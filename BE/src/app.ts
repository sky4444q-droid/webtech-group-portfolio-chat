
import express from "express";
import cors from "cors";
import { getReply } from "./reply";
import {
  addPair,
  clearMessages,
  deleteMessage,
  listMessages,
  recentMessages,
  updateMessage,
} from "./db";

try {
  process.loadEnvFile();
} catch {
  // ไม่มีไฟล์ .env ก็ไม่เป็นไร
}

const app = express();

// อนุญาตให้ Frontend เรียกใช้งาน Backend
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/messages", (req, res) => {
  res.json(listMessages());
});

app.post("/messages", async (req, res) => {
  const text = req.body?.text;

  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const userText = text.trim();

  let replyText: string;

  try {
    replyText = await getReply(userText);
  } catch (err) {
    const e = err as { status?: number; message?: string };

    console.error("LLM error:", e.status ?? "-", e.message);

    if (e.status === 429) {
      res.status(429).json({
        error: "เรียก AI ถี่เกินโควตา รอสักครู่แล้วลองใหม่",
      });
    } else {
      res.status(502).json({
        error: "เรียก AI ไม่สำเร็จ ตรวจ LLM_API_KEY / LLM_MODEL ใน BE/.env",
      });
    }

    return;
  }

  const [userMessage, assistantMessage] = addPair(userText, replyText);

  res.status(201).json({ userMessage, assistantMessage });
});

app.put("/messages/:id", (req, res) => {
  const id = Number(req.params.id);
  const text = req.body?.text;

  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const message = updateMessage(id, text.trim());

  if (!message) {
    res.status(404).json({ error: "message not found" });
    return;
  }

  res.json(message);
});

app.delete("/messages/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!deleteMessage(id)) {
    res.status(404).json({ error: "message not found" });
    return;
  }

  res.json({ message: "deleted" });
});

app.delete("/messages", (req, res) => {
  clearMessages();
  res.json({ message: "cleared" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
