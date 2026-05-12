import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'language-store' });

export const LANGUAGES = [
  { code: 'en', native: 'English',    roman: 'English',   locale: 'en-IN' },
  { code: 'hi', native: 'हिंदी',       roman: 'Hindi',     locale: 'hi-IN' },
  { code: 'bn', native: 'বাংলা',       roman: 'Bengali',   locale: 'bn-IN' },
  { code: 'mr', native: 'मराठी',       roman: 'Marathi',   locale: 'mr-IN' },
  { code: 'ta', native: 'தமிழ்',       roman: 'Tamil',     locale: 'ta-IN' },
  { code: 'te', native: 'తెలుగు',      roman: 'Telugu',    locale: 'te-IN' },
  { code: 'gu', native: 'ગુજરાતી',     roman: 'Gujarati',  locale: 'gu-IN' },
  { code: 'kn', native: 'ಕನ್ನಡ',       roman: 'Kannada',   locale: 'kn-IN' },
  { code: 'ml', native: 'മലയാളം',      roman: 'Malayalam', locale: 'ml-IN' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ',       roman: 'Punjabi',   locale: 'pa-IN' },
  { code: 'or', native: 'ଓଡ଼ିଆ',       roman: 'Odia',      locale: 'or-IN' },
  { code: 'ur', native: 'اردو',        roman: 'Urdu',      locale: 'ur-IN' },
];

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', mr: 'Marathi',
  ta: 'Tamil', te: 'Telugu', gu: 'Gujarati', kn: 'Kannada',
  ml: 'Malayalam', pa: 'Punjabi', or: 'Odia', ur: 'Urdu',
};

interface LanguageStore {
  language: string;
  locale: string;
  hasChosen: boolean;
  setLanguage: (lang: string) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => {
  const saved = storage.getString('app_language');
  const lang = LANGUAGES.find(l => l.code === saved) || LANGUAGES[0];
  return {
    language: saved || 'en',
    locale: lang.locale,
    hasChosen: !!saved,
    setLanguage: (code: string) => {
      const found = LANGUAGES.find(l => l.code === code);
      storage.set('app_language', code);
      set({ language: code, locale: found?.locale || 'en-IN', hasChosen: true });
    },
  };
});
