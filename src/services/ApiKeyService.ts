import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'api-key-store' });
const GEMINI_KEY = 'gemini_api_key';
const GROQ_KEY = 'groq_api_key';

export class ApiKeyService {
  static getGeminiKey() {
    return storage.getString(GEMINI_KEY)?.trim() || '';
  }

  static getGroqKey() {
    return storage.getString(GROQ_KEY)?.trim() || '';
  }

  static hasApiKeys() {
    return !!this.getGeminiKey() && !!this.getGroqKey();
  }

  static hasStoredKeys() {
    return !!storage.getString(GEMINI_KEY) || !!storage.getString(GROQ_KEY);
  }

  static setGeminiKey(key: string) {
    const trimmed = key.trim();
    if (trimmed) storage.set(GEMINI_KEY, trimmed);
    else storage.delete(GEMINI_KEY);
  }

  static setGroqKey(key: string) {
    const trimmed = key.trim();
    if (trimmed) storage.set(GROQ_KEY, trimmed);
    else storage.delete(GROQ_KEY);
  }

  static clearKeys() {
    storage.delete(GEMINI_KEY);
    storage.delete(GROQ_KEY);
  }
}
