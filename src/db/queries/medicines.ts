import { db } from '../schema';

export function addMedicine(data: any) {
  db.execute(
    `INSERT INTO medicines (patient_id, name, generic_name, image_path, dose_amount, dose_unit, times_per_day, dose_times, days_type, custom_days, start_date, end_date, stock_quantity, notes, scan_cache_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.patient_id, data.name, data.generic_name, data.image_path, data.dose_amount, data.dose_unit, data.times_per_day, JSON.stringify(data.dose_times), data.days_type, JSON.stringify(data.custom_days), data.start_date, data.end_date, data.stock_quantity, data.notes, data.scan_cache_json]
  );
  const res = db.execute('SELECT id FROM medicines ORDER BY id DESC LIMIT 1');
  return res.rows?._array[0]?.id;
}

export function getMedicines(patientId: number) {
  return db.execute('SELECT * FROM medicines WHERE patient_id = ? AND is_active = 1', [patientId]).rows?._array || [];
}

export function updateMedicine(id: number, data: any) {
  db.execute(
    `UPDATE medicines SET name=?, generic_name=?, image_path=?, dose_amount=?, dose_unit=?, times_per_day=?, dose_times=?, days_type=?, custom_days=?, start_date=?, end_date=?, stock_quantity=?, notes=? WHERE id=?`,
    [data.name, data.generic_name, data.image_path, data.dose_amount, data.dose_unit, data.times_per_day, JSON.stringify(data.dose_times), data.days_type, JSON.stringify(data.custom_days), data.start_date, data.end_date, data.stock_quantity, data.notes, id]
  );
}

export function deleteMedicine(id: number) {
  db.execute('UPDATE medicines SET is_active = 0 WHERE id = ?', [id]);
}

export function deleteMedicineByName(patientId: number, medicineName: string) {
  db.execute('UPDATE medicines SET is_active = 0 WHERE patient_id = ? AND name = ?', [patientId, medicineName]);
}

export function stopMedicine(id: number, reason?: string) {
  const now = new Date().toISOString();
  db.execute('UPDATE medicines SET is_active = 0, end_date = ?, notes = COALESCE(notes || "\n", "") || ? WHERE id = ?', [now, reason ? `STOPPED: ${reason}` : 'STOPPED by user', id]);
}

export function updateMedicineTiming(id: number, doseTimes: string[]) {
  db.execute('UPDATE medicines SET dose_times = ? WHERE id = ?', [JSON.stringify(doseTimes), id]);
}

export function logReminderAction(medicineId: number, scheduledTime: string, action: string) {
  const now = new Date().toISOString();
  db.execute('INSERT INTO reminder_logs (medicine_id, scheduled_time, action, action_time) VALUES (?, ?, ?, ?)', [medicineId, scheduledTime, action, now]);
}

export function getTodayLogs(patientId: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return db.execute(`
    SELECT rl.* FROM reminder_logs rl
    JOIN medicines m ON m.id = rl.medicine_id
    WHERE m.patient_id = ? AND rl.action_time BETWEEN ? AND ?
    ORDER BY rl.action_time DESC
  `, [patientId, start.toISOString(), end.toISOString()]).rows?._array || [];
}

export function getAdherenceHistory(patientId: number) {
  const logs = db.execute(`
    SELECT rl.action, date(rl.action_time) as log_date 
    FROM reminder_logs rl
    JOIN medicines m ON m.id = rl.medicine_id
    WHERE m.patient_id = ?
    ORDER BY rl.action_time ASC
  `, [patientId]).rows?._array || [];

  // Group logs by date
  const logsByDate: Record<string, { taken: number, skipped: number }> = {};
  logs.forEach(log => {
    if (!logsByDate[log.log_date]) {
      logsByDate[log.log_date] = { taken: 0, skipped: 0 };
    }
    if (log.action === 'taken') logsByDate[log.log_date].taken++;
    if (log.action === 'skipped') logsByDate[log.log_date].skipped++;
  });

  // Calculate overall Health Score (starts at 100)
  let healthScore = 100;
  Object.keys(logsByDate).forEach(date => {
    const day = logsByDate[date];
    if (day.skipped > 0) {
      healthScore -= 20;
    } else if (day.taken > 0) {
      healthScore += 10;
    }
  });

  // Calculate past 7 days trend
  const trend: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const day = logsByDate[dateStr];
    if (day) {
      const total = day.taken + day.skipped;
      if (total === 0) trend.push('No data');
      else trend.push(`${Math.round((day.taken / total) * 100)}% taken`);
    } else {
      trend.push('No data');
    }
  }

  return { healthScore, trend };
}

export function getDetailedAdherenceHistory(patientId: number) {
  const logs = db.execute(`
    SELECT rl.action, rl.scheduled_time, date(rl.action_time) as log_date, m.name
    FROM reminder_logs rl
    JOIN medicines m ON m.id = rl.medicine_id
    WHERE m.patient_id = ?
    ORDER BY rl.action_time DESC
  `, [patientId]).rows?._array || [];

  const historyByDate: Record<string, { date: string, scoreChange: number, skippedMedicines: {name: string, time: string}[] }> = {};

  logs.forEach((log: any) => {
    if (!historyByDate[log.log_date]) {
      historyByDate[log.log_date] = { date: log.log_date, scoreChange: +10, skippedMedicines: [] };
    }
    if (log.action === 'skipped') {
      historyByDate[log.log_date].scoreChange = -20;
      historyByDate[log.log_date].skippedMedicines.push({ name: log.name, time: log.scheduled_time });
    }
  });

  // Convert to array and sort by date descending
  return Object.values(historyByDate).sort((a, b) => b.date.localeCompare(a.date));
}

// db/queries/medicines.ts — ye function add karo

export function getMedicineAdherence(patientId: number, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0]; // 'YYYY-MM-DD'

  const rows = db.execute(`
    SELECT 
      m.name                                          AS medicineName,
      COUNT(*)                                        AS totalDoses,
      SUM(CASE WHEN rl.action = 'taken'   THEN 1 ELSE 0 END) AS takenDoses,
      SUM(CASE WHEN rl.action = 'skipped' THEN 1 ELSE 0 END) AS skippedDoses,
      SUM(CASE WHEN rl.action = 'snoozed' THEN 1 ELSE 0 END) AS snoozedDoses,
      MAX(CASE WHEN rl.action = 'taken' THEN rl.action_time END) AS lastTaken
    FROM medicines m
    LEFT JOIN reminder_logs rl 
      ON rl.medicine_id = m.id 
      AND DATE(rl.action_time) >= ?
    WHERE m.patient_id = ? AND m.is_active = 1
    GROUP BY m.id, m.name
  `, [sinceStr, patientId]).rows?._array || [];

  return rows.map((r: any) => {
    const taken   = r.takenDoses   || 0;
    const skipped = r.skippedDoses || 0;
    const snoozed = r.snoozedDoses || 0;
    const total   = r.totalDoses   || 0;

    // Streak: consecutive days taken (latest first)
    const streakRows = db.execute(`
      SELECT DISTINCT DATE(action_time) AS day
      FROM reminder_logs
      WHERE medicine_id = (
        SELECT id FROM medicines WHERE name = ? AND patient_id = ? LIMIT 1
      ) AND action = 'taken'
      ORDER BY day DESC
    `, [r.medicineName, patientId]).rows?._array || [];

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < streakRows.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];
      if (streakRows[i]?.day === expectedStr) streak++;
      else break;
    }

    return {
      medicineName:      r.medicineName,
      totalDoses:        total,
      takenDoses:        taken,
      skippedDoses:      skipped,
      snoozedDoses:      snoozed,
      missedDoses:       Math.max(0, total - taken - skipped - snoozed),
      adherencePercent:  total > 0 ? Math.round((taken / total) * 100) : 0,
      lastTaken:         r.lastTaken || null,
      streak,
    };
  });
}