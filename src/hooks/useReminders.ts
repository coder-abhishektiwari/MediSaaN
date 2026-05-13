import { NotificationService } from '../services/NotificationService';
import { db } from '../db/schema';
import dayjs from 'dayjs';

export function useReminders() {
  const scheduleAll = async (medicines: any[]) => {
    for (const med of medicines) {
      const doseTimes = JSON.parse(med.dose_times || '[]');
      for (const time of doseTimes) {
        await NotificationService.scheduleMedicineReminder(med, time, true);
      }
    }
  };

  const cancelAll = async (medicineId: number) => {
    await NotificationService.cancelMedicineReminders(medicineId);
  };

  const getTodayStatus = (patientId: number) => {
    const start = dayjs().startOf('day').toISOString();
    const end = dayjs().endOf('day').toISOString();
    const res = db.execute(`
      SELECT COUNT(*) as count, action 
      FROM reminder_logs rl
      JOIN medicines m ON m.id = rl.medicine_id
      WHERE m.patient_id = ? AND rl.action_time BETWEEN ? AND ?
      GROUP BY action
    `, [patientId, start, end]);

    let taken = 0, skipped = 0;
    res.rows?._array.forEach((r: any) => {
      if (r.action === 'taken') taken = r.count;
      if (r.action === 'skipped') skipped = r.count;
    });

    const activeMeds = db.execute('SELECT COUNT(*) as total FROM medicines WHERE patient_id = ? AND is_active = 1', [patientId]);
    const total = activeMeds.rows?._array[0]?.total || 0;

    return { total, taken, skipped };
  };

  return { scheduleAll, cancelAll, getTodayStatus };
}
