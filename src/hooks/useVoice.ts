import { useState, useEffect } from 'react';
import { STTService } from '../services/STTService';
import { TTSService } from '../services/TTSService';
import { useLanguageStore } from '../store/languageStore';

export function useVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { language } = useLanguageStore();

  useEffect(() => {
    return () => {
      STTService.stop();
      TTSService.stop();
    };
  }, []);

  const startListening = () => {
    setIsListening(true);
    setTranscript('');
    STTService.onSpeechResults = (e) => setTranscript(e.value[0]);
    STTService.onSpeechError = (e) => setIsListening(false);
    STTService.onSpeechEnd = () => setIsListening(false);
    STTService.start(language === 'en' ? 'en-IN' : `${language}-IN`);
  };

  const stopListening = () => {
    STTService.stop();
    setIsListening(false);
  };

  const speak = (text: string) => {
    setIsSpeaking(true);
    TTSService.speak(text);
    // Simple mock since TTS doesn't emit easy events without complex setup
    setTimeout(() => setIsSpeaking(false), text.length * 50); 
  };

  return { isSpeaking, isListening, transcript, startListening, stopListening, speak };
}
