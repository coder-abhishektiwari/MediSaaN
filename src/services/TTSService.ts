import Tts from 'react-native-tts';

export class TTSService {
  private static initialized = false;

  static async init(language: string) {
    try {
      const ttsLang = language === 'en' ? 'en-IN' : `${language}-IN`;
      await Tts.setDefaultLanguage(ttsLang);
      Tts.setDefaultRate(0.45);
      Tts.setDefaultPitch(1.0);
      this.initialized = true;
    } catch (e) {
      // Fallback to English
      try {
        await Tts.setDefaultLanguage('en-IN');
        Tts.setDefaultRate(0.45);
        this.initialized = true;
      } catch {}
    }
  }

  static speak(text: string) {
    try {
      Tts.stop();
      Tts.speak(text);
    } catch (e) {
      console.warn('TTS speak error:', e);
    }
  }

  static stop() {
    try {
      Tts.stop();
    } catch {}
  }

  static onFinish(cb: () => void) {
    Tts.addEventListener('tts-finish', cb);
  }

  static removeFinishListener() {
    Tts.removeAllListeners('tts-finish');
  }
}
