import { Patient } from '../store/patientStore';
import { LANGUAGE_NAMES } from '../store/languageStore';
import { getMedicines } from '../db/queries/medicines';
import { getScanHistory } from '../db/queries/reports';

export function buildPatientContext(patient: Patient, language: string) {
  let medicines: string[] = [];
  let reports: string[] = [];
  try {
    if (patient.id) {
      const meds = getMedicines(patient.id);
      medicines = meds.map((m: any) => m.name);

      const history = getScanHistory(patient.id);
      reports = history
        .filter((h: any) => h.type === 'report' && h.is_saved === 1)
        .map((h: any) => {
          try {
            const data = JSON.parse(h.result_json);
            return `${h.created_at}: ${data.report_type} - ${data.simple_verdict}`;
          } catch { return ''; }
        })
        .filter(Boolean);
    }
  } catch {}

  return {
    name:         patient.name,
    age:          patient.age,
    gender:       patient.gender,
    city:         patient.city || 'India',
    conditions:   patient.conditions || [],
    medicines,
    recent_tests: reports.length ? reports.join('; ') : 'None saved',
    allergies:    patient.allergies || 'none',
    language:     LANGUAGE_NAMES[language] || 'English',
  };
}
