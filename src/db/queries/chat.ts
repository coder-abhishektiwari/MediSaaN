import { db } from '../schema';

export function createSession(patientId: number) {
  db.execute('INSERT INTO chat_sessions (patient_id) VALUES (?)', [patientId]);
  const res = db.execute('SELECT id FROM chat_sessions ORDER BY id DESC LIMIT 1');
  return res.rows?._array[0]?.id;
}

export function saveMessage(sessionId: number, role: string, content: string) {
  db.execute('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)', [sessionId, role, content]);
}

export function getMessages(sessionId: number) {
  return db.execute('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', [sessionId]).rows?._array || [];
}

export function getLastSession(patientId: number) {
  const res = db.execute('SELECT id FROM chat_sessions WHERE patient_id = ? ORDER BY id DESC LIMIT 1', [patientId]);
  return res.rows?._array[0]?.id;
}

// ─── New functions for chat history ───────────────────────────────────────────

export function getAllSessions(patientId: number) {
  const res = db.execute(
    `SELECT cs.id, cs.started_at,
      (SELECT content FROM chat_messages WHERE session_id = cs.id AND role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message,
      (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id) as message_count
     FROM chat_sessions cs WHERE patient_id = ? ORDER BY cs.id DESC`,
    [patientId]
  );
  return res.rows?._array || [];
}

export function deleteSession(sessionId: number) {
  // Delete messages first (foreign key constraint)
  db.execute('DELETE FROM chat_messages WHERE session_id = ?', [sessionId]);
  // Then delete session
  db.execute('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
}

export function deleteAllMessages(sessionId: number) {
  db.execute('DELETE FROM chat_messages WHERE session_id = ?', [sessionId]);
}
