import { Patient } from '../store/patientStore';
import { LANGUAGE_NAMES } from '../store/languageStore';
import { getMedicines } from '../db/queries/medicines';

export function buildPatientContext(patient: Patient, language: string) {
  let medicines: string[] = [];
  try {
    if (patient.id) {
      const meds = getMedicines(patient.id);
      medicines = meds.map((m: any) => m.name);
    }
  } catch {}

  return {
    name:         patient.name,
    age:          patient.age,
    gender:       patient.gender,
    city:         patient.city || 'India',
    conditions:   patient.conditions || [],
    medicines,
    allergies:    patient.allergies || 'none',
    recent_tests: 'Not specified',
    language:     LANGUAGE_NAMES[language] || 'English',
  };
}
