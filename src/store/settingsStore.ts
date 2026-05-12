import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'settings-store' });

interface SettingsStore {
  fontScale: number;
  highContrast: boolean;
  shortcutsEnabled: boolean;
  caregiverAlertsEnabled: boolean;
  setFontScale: (scale: number) => void;
  setHighContrast: (v: boolean) => void;
  setShortcutsEnabled: (v: boolean) => void;
  setCaregiverAlerts: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  fontScale:              parseFloat(storage.getString('fontScale') ?? '1'),
  highContrast:           storage.getBoolean('highContrast') ?? false,
  shortcutsEnabled:       storage.getBoolean('shortcutsEnabled') ?? true,
  caregiverAlertsEnabled: storage.getBoolean('caregiverAlerts') ?? false,
  setFontScale: (scale) => { storage.set('fontScale', String(scale)); set({ fontScale: scale }); },
  setHighContrast: (v) =>  { storage.set('highContrast', v);          set({ highContrast: v }); },
  setShortcutsEnabled:(v)=> { storage.set('shortcutsEnabled', v);     set({ shortcutsEnabled: v }); },
  setCaregiverAlerts: (v)=> { storage.set('caregiverAlerts', v);      set({ caregiverAlertsEnabled: v }); },
}));
