import { NativeModules, NativeEventEmitter } from 'react-native';

const { MediSaaNNativeModule } = NativeModules;
const voiceEmitter = MediSaaNNativeModule ? new NativeEventEmitter(MediSaaNNativeModule) : null;

let resultListener: any = null;
let errorListener: any = null;

export class STTService {
  static onSpeechResults: (e: any) => void = () => {};
  static onSpeechError: (e: any) => void = () => {};
  static onSpeechStart: () => void = () => {};
  static onSpeechEnd: () => void = () => {};

  static async start(locale: string) {
    if (!MediSaaNNativeModule) return;
    
    this.cleanup();
    
    resultListener = voiceEmitter?.addListener('onVoiceResult', (event) => {
      this.onSpeechResults({ value: [event.text] });
      this.onSpeechEnd();
    });
    
    errorListener = voiceEmitter?.addListener('onVoiceError', (event) => {
      this.onSpeechError(event.error);
      this.onSpeechEnd();
    });

    this.onSpeechStart();
    await MediSaaNNativeModule.startVoiceRecognition(locale);
  }

  static async stop() {
    if (!MediSaaNNativeModule) return;
    await MediSaaNNativeModule.stopVoiceRecognition();
    this.onSpeechEnd();
    this.cleanup();
  }

  static destroy() {
    this.stop();
  }

  static cleanup() {
    if (resultListener) {
      resultListener.remove();
      resultListener = null;
    }
    if (errorListener) {
      errorListener.remove();
      errorListener = null;
    }
  }
}
