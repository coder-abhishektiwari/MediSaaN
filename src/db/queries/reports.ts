import { db } from '../schema';

export function saveScanResult(patientId: number, type: string, imagePath: string, resultJson: string, severity: string, isSaved: boolean = false) {
  const res = db.execute(
    'INSERT INTO scan_results (patient_id, type, image_path, result_json, severity, is_saved) VALUES (?, ?, ?, ?, ?, ?)',
    [patientId, type, imagePath, resultJson, severity, isSaved ? 1 : 0]
  );
  return res.insertId;
}

export function markScanAsSaved(id: number, isSaved: boolean) {
  db.execute('UPDATE scan_results SET is_saved = ? WHERE id = ?', [isSaved ? 1 : 0, id]);
}

export function getScanHistory(patientId: number) {
  return db.execute('SELECT * FROM scan_results WHERE patient_id = ? ORDER BY created_at DESC', [patientId]).rows?._array || [];
}

export function deleteScan(id: number) {
  db.execute('DELETE FROM scan_results WHERE id = ?', [id]);
}
