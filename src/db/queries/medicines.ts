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
