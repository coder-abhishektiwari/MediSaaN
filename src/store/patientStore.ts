import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'patient-store' });

export interface Patient {
  id?: number;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  city: string;
  blood_group: string;
  conditions: string[];
  allergies: string;
  caregiver_name: string;
  caregiver_phone: string;
  doctor_name: string;
  doctor_phone: string;
}

interface PatientStore {
  patient: Patient | null;
  isProfileComplete: boolean;
  setPatient: (p: Patient) => void;
  clearPatient: () => void;
}

export const usePatientStore = create<PatientStore>((set) => {
  const saved = storage.getString('patient_profile');
  const patient = saved ? JSON.parse(saved) : null;
  return {
    patient,
    isProfileComplete: !!(patient?.name),
    setPatient: (p: Patient) => {
      storage.set('patient_profile', JSON.stringify(p));
      set({ patient: p, isProfileComplete: true });
    },
    clearPatient: () => {
      storage.delete('patient_profile');
      set({ patient: null, isProfileComplete: false });
    },
  };
});
