import { DatabaseSync } from "node:sqlite";
import path from "node:path";

export interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const DB_FILE = process.env.DB_PATH || path.join(__dirname, "..", "chat.db");

const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const toMessage = (r: Record<string, unknown>): Message => ({
  id: Number(r.id),
  role: r.role as Message["role"],
  text: String(r.text),
});

const qAll = db.prepare("SELECT id, role, text FROM messages ORDER BY id");
const qRecent = db.prepare("SELECT id, role, text FROM messages ORDER BY id DESC LIMIT ?");
const qGet = db.prepare("SELECT id, role, text FROM messages WHERE id = ?");
const qInsert = db.prepare("INSERT INTO messages (role, text) VALUES (?, ?)");
const qUpdate = db.prepare("UPDATE messages SET text = ? WHERE id = ?");
const qDelete = db.prepare("DELETE FROM messages WHERE id = ?");
const qClear = db.prepare("DELETE FROM messages");

export function listMessages(): Message[] {
  return qAll.all().map(toMessage);
}

export function recentMessages(n: number): Message[] {
  return qRecent.all(n).map(toMessage).reverse();
}

export function addPair(userText: string, assistantText: string): [Message, Message] {
  db.exec("BEGIN");
  try {
    const u = qInsert.run("user", userText);
    const a = qInsert.run("assistant", assistantText);
    db.exec("COMMIT");
    return [
      { id: Number(u.lastInsertRowid), role: "user", text: userText },
      { id: Number(a.lastInsertRowid), role: "assistant", text: assistantText },
    ];
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function updateMessage(id: number, text: string): Message | null {
  if (qUpdate.run(text, id).changes === 0) return null;
  return toMessage(qGet.get(id) as Record<string, unknown>);
}

export function deleteMessage(id: number): boolean {
  return qDelete.run(id).changes > 0;
}

export function clearMessages(): void {
  qClear.run();
}
