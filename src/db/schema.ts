import { open } from 'react-native-quick-sqlite';

export const db = open({ name: 'medisaan.db' });

export function initDatabase() {
  db.execute(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER,
      gender TEXT CHECK(gender IN ('male','female','other')),
      city TEXT,
      blood_group TEXT,
      conditions TEXT DEFAULT '[]',
      allergies TEXT,
      caregiver_name TEXT,
      caregiver_phone TEXT,
      doctor_name TEXT,
      doctor_phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      name TEXT NOT NULL,
      generic_name TEXT,
      dose_amount REAL,
      dose_unit TEXT,
      times_per_day INTEGER DEFAULT 1,
      dose_times TEXT DEFAULT '[]',
      days_type TEXT DEFAULT 'daily',
      custom_days TEXT DEFAULT '[]',
      start_date TEXT,
      end_date TEXT,
      stock_quantity INTEGER DEFAULT 0,
      notes TEXT,
      scan_cache_json TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS reminder_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER,
      scheduled_time TEXT,
      action TEXT CHECK(action IN ('taken','skipped','snoozed')),
      action_time TEXT DEFAULT (datetime('now'))
    );
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      type TEXT CHECK(type IN ('medicine','report')),
      image_path TEXT,
      result_json TEXT,
      severity TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      started_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      role TEXT CHECK(role IN ('user','assistant')),
      content TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
