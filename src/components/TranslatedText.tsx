import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTranslateAIResponse } from '../hooks/useTranslateAIResponse';

interface TranslatedTextProps extends TextProps {
  children: string;
}

/**
 * A Text component that automatically translates its English string content
 * into the user's selected UI language using ML Kit on-device translation.
 */
export function TranslatedText({ children, style, ...props }: TranslatedTextProps) {
  const translatedText = useTranslateAIResponse(children || '');

  return (
    <Text style={style} {...props}>
      {translatedText}
    </Text>
  );
}
