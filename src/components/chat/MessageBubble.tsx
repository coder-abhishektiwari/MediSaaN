import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TTSService } from '../../services/TTSService';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

export default function MessageBubble({ role, content, time }: Props) {
  const isBot = role === 'assistant';
  return (
    <View style={[styles.row, isBot ? styles.rowBot : styles.rowUser]}>
      {isBot && <View style={styles.avatar}><Text style={styles.avatarText}>M</Text></View>}
      <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
        <Text style={[styles.text, isBot ? styles.textBot : styles.textUser]}>{content}</Text>
        <View style={styles.footer}>
          <Text style={styles.time}>{time}</Text>
          {isBot && (
            <TouchableOpacity onPress={() => TTSService.speak(content)}>
              <Text style={{ fontSize: 13 }}>🔊</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'flex-end' },
  rowBot: { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  bubble: { maxWidth: '78%', borderRadius: borderRadius.lg, padding: spacing.lg, gap: 5 },
  bubbleBot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  text: { ...typography.bodyMedium, lineHeight: 24 },
  textBot: { color: colors.textPrimary },
  textUser: { color: '#fff' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  time: { ...typography.tiny, color: colors.textMuted },
});
