import { Patient } from '../store/patientStore';
import { LANGUAGE_NAMES} from '../store/languageStore';
import { getMedicines, getMedicineAdherence } from '../db/queries/medicines';
import { getScanHistory } from '../db/queries/reports';

// Map language codes to native language names (for AI models)
const NATIVE_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'हिंदी',
  bn: 'বাংলা',
  mr: 'मराठी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  pa: 'ਪੰਜਾਬੀ',
  or: 'ଓଡ଼ିଆ',
  ur: 'اردو',
};

export function buildPatientContext(patient: Patient, language: string) {
  let medicines: string[] = [];
  let reports: string[]   = [];
  let adherence: any[]    = [];

  try {
    if (patient.id) {
      const meds = getMedicines(patient.id);
      medicines = meds.map((m: any) => m.name);

      adherence = getMedicineAdherence(patient.id, 30);

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
    adherence,
    recent_tests: reports.length ? reports.join('; ') : 'None saved',
    allergies:    patient.allergies || 'none',
    language:     language, // language code (e.g., 'hi', 'bn', 'en')
    languageName: LANGUAGE_NAMES[language] || 'English', // English name (e.g., 'Hindi', 'Bengali', 'English')
    nativeLanguageName: NATIVE_LANGUAGE_NAMES[language] || 'English', // Native name (e.g., 'हिंदी', 'বাংলা', 'English')
  };
}
