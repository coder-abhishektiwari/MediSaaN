import { useState, useEffect } from 'react';
import FastTranslator from 'fast-mlkit-translate-text';
import { useLanguageStore } from '../store/languageStore';
import { MLKIT_LANG_MAP } from '../screens/LanguagePickerScreen';

/**
 * A hook that takes an English AI response and translates it dynamically using ML Kit.
 * Whenever the app's selected language changes, this hook automatically re-translates 
 * the text to the new language without requiring a network call.
 */
export function useTranslateAIResponse(originalText: string) {
  const { language } = useLanguageStore();
  const [displayedText, setDisplayedText] = useState(originalText);

  useEffect(() => {
    let isMounted = true;

    async function performTranslation() {
      // 1. If English, empty, or unsupported, return original
      if (!originalText || language === 'en') {
        if (isMounted) setDisplayedText(originalText);
        return;
      }

      const mlKitName = MLKIT_LANG_MAP[language];
      if (!mlKitName) {
        if (isMounted) setDisplayedText(originalText);
        return;
      }

      // 2. Check if model is downloaded
      try {
        const isReady = await FastTranslator.isLanguageDownloaded(mlKitName);
        // removed early return to allow auto-download

        // 3. Prepare translator and translate
        await FastTranslator.prepare({
          source: 'English',
          target: mlKitName,
          downloadIfNeeded: true,
        });

        const result = await FastTranslator.translate(originalText);
        if (isMounted && result) {
          setDisplayedText(result);
        }
      } catch (err) {
        console.warn('AI Translation failed:', err);
        // 4. Graceful fallback on any failure
        if (isMounted) setDisplayedText(originalText);
      }
    }

    performTranslation();

    return () => {
      isMounted = false;
    };
  }, [originalText, language]);

  return displayedText;
}
