import { usePatientStore } from '../store/patientStore';
import { buildPatientContext } from '../utils/promptBuilder';
import { useLanguageStore } from '../store/languageStore';

export function usePatient() {
  const { patient, isProfileComplete, setPatient, clearPatient } = usePatientStore();
  const { language } = useLanguageStore();

  const getContext = () => {
    if (!patient) return null;
    return buildPatientContext(patient, language);
  };

  return { patient, isProfileComplete, setPatient, clearPatient, getContext };
}
