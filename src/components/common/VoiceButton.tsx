import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useVoice } from '../../hooks/useVoice';
import { colors } from '../../theme';

export default function VoiceButton({ onResult }: any) {
  const { isListening, startListening, stopListening, transcript } = useVoice();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      if (transcript) onResult(transcript);
    }
  }, [isListening, transcript]);

  return (
    <TouchableOpacity onPress={isListening ? stopListening : startListening} style={styles.btn}>
      <Animated.View style={[styles.ring, { transform: [{ scale: pulseAnim }], opacity: isListening ? 0.3 : 0 }]} />
      <Text style={styles.icon}>🎙</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 28, color: colors.surface },
  ring: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, borderRadius: 32, backgroundColor: colors.primary }
});
