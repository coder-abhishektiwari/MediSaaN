import { db } from '../schema';

export function saveScanResult(patientId: number, type: string, imagePath: string, resultJson: string, severity: string) {
  db.execute(
    'INSERT INTO scan_results (patient_id, type, image_path, result_json, severity) VALUES (?, ?, ?, ?, ?)',
    [patientId, type, imagePath, resultJson, severity]
  );
}

export function getScanHistory(patientId: number) {
  return db.execute('SELECT * FROM scan_results WHERE patient_id = ? ORDER BY created_at DESC', [patientId]).rows?._array || [];
}

export function deleteScan(id: number) {
  db.execute('DELETE FROM scan_results WHERE id = ?', [id]);
}
