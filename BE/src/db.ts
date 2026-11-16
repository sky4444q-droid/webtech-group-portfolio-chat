import { Pool } from "pg";

export interface Source {
  title: string;
  url: string | null;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("⚠️ ยังไม่ได้ตั้ง DATABASE_URL ใน BE/.env (ดู BE/.env.example)");
}

// Render/Neon จากข้างนอกต้องใช้ SSL ส่วน localhost ไม่ต้อง
const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL ?? "");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      text       TEXT NOT NULL,
      sources    JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS messages_session_idx ON messages (session_id, id);
  `);
}

const toMessage = (r: Record<string, unknown>): Message => ({
  id: Number(r.id),
  role: r.role as Message["role"],
  text: String(r.text),
  ...(r.sources ? { sources: r.sources as Source[] } : {}),
});

export async function listMessages(sessionId: string): Promise<Message[]> {
  const { rows } = await pool.query(
    "SELECT id, role, text, sources FROM messages WHERE session_id = $1 ORDER BY id",
    [sessionId],
  );
  return rows.map(toMessage);
}

export async function recentMessages(sessionId: string, n: number): Promise<Message[]> {
  const { rows } = await pool.query(
    "SELECT id, role, text, sources FROM messages WHERE session_id = $1 ORDER BY id DESC LIMIT $2",
    [sessionId, n],
  );
  return rows.map(toMessage).reverse();
}

export async function addPair(
  sessionId: string,
  userText: string,
  assistantText: string,
  sources: Source[],
): Promise<[Message, Message]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const u = await client.query(
      "INSERT INTO messages (session_id, role, text) VALUES ($1, 'user', $2) RETURNING id",
      [sessionId, userText],
    );
    const a = await client.query(
      "INSERT INTO messages (session_id, role, text, sources) VALUES ($1, 'assistant', $2, $3) RETURNING id",
      [sessionId, assistantText, JSON.stringify(sources)],
    );
    await client.query("COMMIT");
    return [
      { id: Number(u.rows[0].id), role: "user", text: userText },
      { id: Number(a.rows[0].id), role: "assistant", text: assistantText, sources },
    ];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateMessage(
  sessionId: string,
  id: number,
  text: string,
): Promise<Message | null> {
  const { rows } = await pool.query(
    "UPDATE messages SET text = $1 WHERE id = $2 AND session_id = $3 RETURNING id, role, text, sources",
    [text, id, sessionId],
  );
  return rows[0] ? toMessage(rows[0]) : null;
}

export async function deleteMessage(sessionId: string, id: number): Promise<boolean> {
  const r = await pool.query("DELETE FROM messages WHERE id = $1 AND session_id = $2", [id, sessionId]);
  return (r.rowCount ?? 0) > 0;
}

export async function clearMessages(sessionId: string): Promise<void> {
  await pool.query("DELETE FROM messages WHERE session_id = $1", [sessionId]);
}
