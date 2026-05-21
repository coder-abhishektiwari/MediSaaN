import { db } from '../schema';

export function createSession(patientId: number) {
  try {
    db.execute('INSERT INTO chat_sessions (patient_id) VALUES (?)', [patientId]);
    const res = db.execute('SELECT last_insert_rowid() AS id');
    const id = res.rows?._array[0]?.id;
    const numId = typeof id === 'number' ? id : Number(id) || null;
    console.log('[Chat DB] Created session with id:', numId, 'for patient:', patientId);
    return numId;
  } catch (err) {
    console.error('[Chat DB] createSession error:', err);
    return null;
  }
}

export function saveMessage(sessionId: number, role: string, content: string) {
  try {
    if (!sessionId) {
      console.warn('saveMessage: invalid sessionId', sessionId);
      return;
    }
    const res = db.execute('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)', [sessionId, role, content]);
    console.log('[Chat DB] Saved message to session', sessionId, '- role:', role);
  } catch (err) {
    console.error('[Chat DB] saveMessage error:', err);
  }
}

export function getMessages(sessionId: number) {
  try {
    const res = db.execute('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', [sessionId]);
    const msgs = res.rows?._array || [];
    console.log('[Chat DB] getMessages for session', sessionId, '- found', msgs.length, 'messages');
    return msgs;
  } catch (err) {
    console.error('[Chat DB] getMessages error:', err);
    return [];
  }
}

export function getLastSession(patientId: number) {
  try {
    const res = db.execute('SELECT id FROM chat_sessions WHERE patient_id = ? ORDER BY id DESC LIMIT 1', [patientId]);
    const id = res.rows?._array[0]?.id;
    console.log('[Chat DB] getLastSession for patient', patientId, '- id:', id);
    return id;
  } catch (err) {
    console.error('[Chat DB] getLastSession error:', err);
    return null;
  }
}

// ─── New functions for chat history ───────────────────────────────────────────

export function getAllSessions(patientId: number) {
  try {
    const res = db.execute(
      `SELECT cs.id, cs.started_at,
        (SELECT content FROM chat_messages WHERE session_id = cs.id AND role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message,
        (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id) as message_count
       FROM chat_sessions cs WHERE patient_id = ? ORDER BY cs.id DESC`,
      [patientId]
    );
    const sessions = res.rows?._array || [];
    console.log('[Chat DB] getAllSessions for patient', patientId, '- found', sessions.length, 'sessions');
    return sessions;
  } catch (err) {
    console.error('[Chat DB] getAllSessions error:', err);
    return [];
  }
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
