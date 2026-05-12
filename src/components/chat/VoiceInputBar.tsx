import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onMic: () => void;
  isListening: boolean;
  disabled?: boolean;
}

export default function VoiceInputBar({ value, onChange, onSend, onMic, isListening, disabled }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.mic, isListening && styles.micActive]} onPress={onMic}>
        <Text style={styles.micIcon}>{isListening ? '⏹' : '🎙'}</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input} value={value} onChangeText={onChange}
        placeholder={isListening ? 'Listening...' : 'Type or speak...'}
        placeholderTextColor={isListening ? colors.primary : colors.textMuted}
        multiline returnKeyType="send" onSubmitEditing={onSend} editable={!isListening}
      />
      <TouchableOpacity
        style={[styles.send, (!value.trim() || disabled) && styles.sendOff]}
        onPress={onSend} disabled={!value.trim() || disabled}
      >
        <Text style={styles.sendIcon}>➤</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  mic: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  micActive: { backgroundColor: colors.primary },
  micIcon: { fontSize: 22 },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, ...typography.bodyMedium, color: colors.textPrimary, maxHeight: 100 },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendOff: { backgroundColor: colors.border },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
