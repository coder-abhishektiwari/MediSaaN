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
