import Voice from '@react-native-voice/voice';

type Callback = (text: string) => void;
type ErrorCb  = (e: any) => void;

export class STTService {
  static start(locale: string, onResult: Callback, onError: ErrorCb) {
    Voice.onSpeechResults = (e) => {
      const text = e.value?.[0];
      if (text) onResult(text);
    };
    Voice.onSpeechError = (e) => onError(e);
    Voice.onSpeechEnd = () => {};
    Voice.start(locale).catch(onError);
  }

  static stop() {
    Voice.stop().catch(() => {});
  }

  static destroy() {
    Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
  }
}
