import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'voice-store' });

interface VoiceStore {
  isVoiceModeActive: boolean;
  setVoiceModeActive: (active: boolean) => void;
}

export const useVoiceStore = create<VoiceStore>((set) => {
  return {
    isVoiceModeActive: false,
    setVoiceModeActive: (active: boolean) => {
      storage.set('voice_mode_active', active);
      set({ isVoiceModeActive: active });
    },
  };
});