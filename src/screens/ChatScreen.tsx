import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Animated,
  Modal, Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';
import { useVoiceStore } from '../store/voiceStore';
import { chatWithBot } from '../api/groq';
import { buildPatientContext } from '../utils/promptBuilder';
import { TTSService } from '../services/TTSService';
import { STTService } from '../services/STTService';
import { createSession, saveMessage, getMessages, getLastSession } from '../db/queries/chat';
import { colors, typography, spacing, borderRadius } from '../theme';
import dayjs from 'dayjs';

// ─── Language config ──────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { id: 'forgot', labelKey: 'chat_quick_prompt_forgot_label', textKey: 'chat_quick_prompt_forgot_text' },
  { id: 'pain', labelKey: 'chat_quick_prompt_pain_label', textKey: 'chat_quick_prompt_pain_text' },
  { id: 'side', labelKey: 'chat_quick_prompt_side_label', textKey: 'chat_quick_prompt_side_text' },
  { id: 'doctor', labelKey: 'chat_quick_prompt_doctor_label', textKey: 'chat_quick_prompt_doctor_text' },
  { id: 'diet', labelKey: 'chat_quick_prompt_diet_label', textKey: 'chat_quick_prompt_diet_text' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; time: string };

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({ msg, onSpeak }: { msg: ChatMessage; onSpeak: (t: string) => void }) {
  const isBot = msg.role === 'assistant';
  return (
    <View style={[bub.row, isBot ? bub.rowBot : bub.rowUser]}>
      {isBot && (
        <View style={bub.avatar}>
          <Icon name="robot-happy-outline" size={18} color="#fff" />
        </View>
      )}
      <View style={[bub.bubble, isBot ? bub.bubbleBot : bub.bubbleUser]}>
        <Text style={[bub.text, isBot ? bub.textBot : bub.textUser]}>{msg.content}</Text>
        <View style={bub.footer}>
          <Text style={bub.time}>{msg.time}</Text>
          {isBot && (
            <TouchableOpacity onPress={() => onSpeak(msg.content)} style={bub.speakBtn}>
              <Icon name="volume-high" size={15} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
const bub = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'flex-end' },
  rowBot: { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  bubble: { maxWidth: '78%', borderRadius: borderRadius.xl, padding: spacing.lg, gap: 6 },
  bubbleBot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  bubbleUser: { backgroundColor: colors.primaryDark, borderBottomRightRadius: 6 },
  text: { ...typography.bodyMedium, lineHeight: 24 },
  textBot: { color: colors.textPrimary },
  textUser: { color: '#fff' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  time: { ...typography.tiny, color: colors.textMuted },
  speakBtn: { padding: 2 },
});

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: -8, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]));
    Animated.parallel([anim(dot1, 0), anim(dot2, 150), anim(dot3, 300)]).start();
  }, []);
  return (
    <View style={ti.row}>
      <View style={ti.avatar}><Icon name="robot-happy-outline" size={18} color="#fff" /></View>
      <View style={ti.bubble}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View key={i} style={[ti.dot, { transform: [{ translateY: d }] }]} />
        ))}
      </View>
    </View>
  );
}
const ti = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md, alignItems: 'flex-end' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  bubble: { flexDirection: 'row', gap: 5, backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});

// ─── Voice Orb animation ──────────────────────────────────────────────────────
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

function VoiceOrb({ state }: { state: VoiceState }) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pulse1.setValue(1); pulse2.setValue(1); pulse3.setValue(1);
    rotate.setValue(0); orbScale.setValue(1);

    if (state === 'listening') {
      // Ripple rings expanding out
      const ring = (val: Animated.Value, delay: number) =>
        Animated.loop(Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 2.2, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
          Animated.timing(val, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]));
      Animated.parallel([ring(pulse1, 0), ring(pulse2, 400), ring(pulse3, 800)]).start();
    } else if (state === 'speaking') {
      // Gentle breathing orb
      Animated.loop(Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.18, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(orbScale, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])).start();
    } else if (state === 'processing') {
      Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.linear })
      ).start();
    }
  }, [state]);

  const rotateInterp = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const orbColor = state === 'idle' ? colors.primary
    : state === 'listening' ? colors.success
      : state === 'speaking' ? '#F59E0B'
        : colors.info; // processing

  const ringOpacity = state === 'listening' ? 0.25 : 0;

  return (
    <View style={vo.container}>
      {/* Ripple rings */}
      {[pulse1, pulse2, pulse3].map((p, i) => (
        <Animated.View
          key={i}
          style={[
            vo.ring,
            { opacity: ringOpacity, backgroundColor: '#22C55E', transform: [{ scale: p }] },
          ]}
        />
      ))}

      {/* Orb */}
      <Animated.View
        style={[
          vo.orb,
          { backgroundColor: orbColor, transform: [{ scale: orbScale }, { rotate: state === 'processing' ? rotateInterp : '0deg' }] },
        ]}
      >
        <Icon name={state === 'listening' ? 'microphone' : state === 'speaking' ? 'volume-high' : 'robot-happy-outline'} size={44} color="#fff" />
      </Animated.View>
    </View>
  );
}
const ORB = 110;
const RING = ORB + 40;
const vo = StyleSheet.create({
  container: { width: RING + 80, height: RING + 80, justifyContent: 'center', alignItems: 'center' },
  ring: {
    position: 'absolute',
    width: RING, height: RING,
    borderRadius: RING / 2,
  },
  orb: {
    width: ORB, height: ORB,
    borderRadius: ORB / 2,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});

// ─── Voice Modal ──────────────────────────────────────────────────────────────
interface VoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (text: string) => Promise<string | null>;
  language: string;
  locale: string;
  patientName: string;
}

function VoiceModal({ visible, onClose, onSend, language: _language, locale, patientName }: VoiceModalProps) {
  const { t } = useTranslation();
  const lc = {
    voiceHint: t('chat_voice_hint'),
    listeningText: t('chat_listening'),
    tapToSpeak: t('chat_tap_to_speak'),
    interruptLabel: t('chat_interrupt_label'),
    speakingLabel: t('chat_speaking_label'),
  };
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const isSpeaking = useRef(false);

  useEffect(() => {
    STTService.onSpeechStart          = () => setVoiceState('listening');
    STTService.onSpeechEnd            = () => setVoiceState('processing');
    STTService.onSpeechError          = () => setVoiceState('idle');
    STTService.onSpeechResults        = async (e: any) => {
      const text = e.value?.[0] ?? '';
      if (!text) { setVoiceState('idle'); return; }
      setTranscript(text);
      setVoiceState('processing');
      const reply = await onSend(text);
      if (reply) {
        setVoiceState('speaking');
        isSpeaking.current = true;
        TTSService.speak(reply);
      } else {
        setVoiceState('idle');
      }
    };

    return () => {
      try {
        STTService.onSpeechStart          = () => {};
        STTService.onSpeechEnd            = () => {};
        STTService.onSpeechError          = () => {};
        STTService.onSpeechResults        = () => {};
        STTService.stop();
      } catch {}
    };
  }, [onSend]);

  // ── Auto-start listening when modal opens ──────────────────
  useEffect(() => {
    TTSService.onFinish(() => {
      if (isSpeaking.current && visible) {
        isSpeaking.current = false;
        startListening();
      }
    });
    return () => TTSService.removeFinishListener();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setTranscript('');
      setVoiceState('idle');
      // Small delay so modal animation doesn't interfere
      const timer = setTimeout(() => startListening(), 400);
      return () => clearTimeout(timer);
    } else {
      stopListeningNow();
    }
  }, [visible]);

  const startListening = useCallback(async () => {
    if (isSpeaking.current) { TTSService.stop(); isSpeaking.current = false; }
    setTranscript('');
    try {
      await STTService.stop();
      await STTService.start(locale);
      setVoiceState('listening');
    } catch (e) {
      console.warn('STTService.start error', e);
      setVoiceState('idle');
    }
  }, [locale]);

  const stopListeningNow = useCallback(async () => {
    try { await STTService.stop(); } catch { }
    setVoiceState('idle');
  }, []);

  const stopAI = useCallback(() => {
    TTSService.stop();
    isSpeaking.current = false;
    setVoiceState('idle');
    // Re-listen after interrupt
    setTimeout(() => startListening(), 300);
  }, [startListening]);

  const handleOrbPress = () => {
    if (voiceState === 'listening') {
      stopListeningNow();
    } else if (voiceState === 'speaking') {
      stopAI(); // interrupt + re-listen
    } else {
      startListening();
    }
  };

  const stateLabel =
    voiceState === 'idle' ? lc.tapToSpeak
      : voiceState === 'listening' ? lc.listeningText
        : voiceState === 'speaking' ? lc.speakingLabel
          : '...';

  return (
    // ── TRULY FULLSCREEN — no bottom sheet, covers whole screen ──
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={vm.fullscreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />

        {/* Top bar */}
        <View style={vm.topBar}>
          <TouchableOpacity style={vm.closeBtn} onPress={onClose}>
          <Icon name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={vm.topTitle}>MediSaaN Voice</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Patient chip */}
        <View style={vm.patientChip}>
          <Icon name="account-heart-outline" size={15} color="#BDF5EA" />
          <Text style={vm.patientChipText}>{patientName}</Text>
        </View>

        {/* Center — Orb */}
        <View style={vm.center}>
          <TouchableOpacity onPress={handleOrbPress} activeOpacity={0.85}>
            <VoiceOrb state={voiceState} />
          </TouchableOpacity>

          <Text style={[vm.stateLabel, voiceState === 'listening' && vm.stateLabelActive]}>
            {stateLabel}
          </Text>

          {/* Live transcript */}
          {!!transcript && (
            <View style={vm.transcriptBox}>
              <Text style={vm.transcriptText}>"{transcript}"</Text>
            </View>
          )}
        </View>

        {/* Bottom — waveform + interrupt */}
        <View style={vm.bottom}>
          {voiceState === 'speaking' && (
            <TouchableOpacity style={vm.interruptBtn} onPress={stopAI}>
              <Icon name="stop-circle-outline" size={18} color={colors.warning} />
              <Text style={vm.interruptText}>{lc.interruptLabel}</Text>
            </TouchableOpacity>
          )}
          <WaveformBars active={voiceState === 'listening' || voiceState === 'speaking'} />
          <Text style={vm.hintText}>
            {voiceState === 'idle' ? lc.voiceHint : ' '}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function WaveformBars({ active }: { active: boolean }) {
  const bars = useRef(Array.from({ length: 24 }, () => new Animated.Value(4))).current;
  useEffect(() => {
    if (active) {
      bars.forEach((b) => {
        Animated.loop(Animated.sequence([
          Animated.timing(b, {
            toValue: 4 + Math.random() * 28,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
          Animated.timing(b, { toValue: 4, duration: 200 + Math.random() * 300, useNativeDriver: false }),
        ])).start();
      });
    } else {
      bars.forEach(b => b.setValue(4));
    }
  }, [active, bars]);

  return (
    <View style={wf.row}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={[
            wf.bar,
            { height: b, opacity: active ? 0.7 : 0.2 },
          ]}
        />
      ))}
    </View>
  );
}
const wf = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 24, height: 40 },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.primary },
});

const vm = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  topBar: {
    width: '100%', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },

  patientChip: {
    paddingHorizontal: 18, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)',
    marginBottom: 12,
  },
  patientChipText: { color: '#BDF5EA', fontSize: 13, fontWeight: '700' },

  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20,
    paddingHorizontal: 32,
  },

  stateLabel: {
    fontSize: 18, color: 'rgba(255,255,255,0.5)',
    fontWeight: '500', letterSpacing: 0.3, textAlign: 'center',
  },
  stateLabelActive: { color: '#22C55E', opacity: 1 },

  transcriptBox: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: '90%',
  },
  transcriptText: {
    color: '#fff', fontSize: 16, textAlign: 'center',
    fontStyle: 'italic', lineHeight: 24,
  },

  bottom: {
    width: '100%', alignItems: 'center',
    paddingBottom: 40, paddingHorizontal: 24, gap: 16,
  },
  interruptBtn: {
    paddingHorizontal: 32, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 30, borderWidth: 1.5, borderColor: '#F59E0B',
  },
  interruptText: { color: '#F59E0B', fontWeight: '700', fontSize: 15 },
  hintText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' },

  // Unused old keys kept blank to avoid TS errors if referenced elsewhere
  overlay: {}, sheet: {}, handle: {}, botLabel: {}, patientLabel: {}, orbWrap: {},
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { patient } = usePatientStore();
  const { language, locale } = useLanguageStore();
  const { isVoiceModeActive, setVoiceModeActive } = useVoiceStore();

  const lc = {
    welcome: (name?: string) => t('chat_welcome', { name: name || patient?.name || t('chat_default_user') }),
    quickPrompts: QUICK_PROMPTS.map(prompt => ({
      id: prompt.id,
      label: t(prompt.labelKey),
      text: t(prompt.textKey),
    })),
    voiceHint: t('chat_voice_hint'),
    listeningText: t('chat_listening'),
    typePlaceholder: t('chat_type_placeholder'),
    botStatus: t('chat_bot_status'),
    tapToSpeak: t('chat_tap_to_speak'),
    interruptLabel: t('chat_interrupt_label'),
    speakingLabel: t('chat_speaking_label'),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [voiceModalVisible, setVoiceModalVisible] = useState(isVoiceModeActive);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    setVoiceModalVisible(isVoiceModeActive);
  }, [isVoiceModeActive]);

  useEffect(() => {
    if (!patient?.id) return;

    let sid = getLastSession(patient.id);
    if (!sid) sid = createSession(patient.id);
    setSessionId(sid);
    const stored = getMessages(sid).map((m: any) => ({
      id: String(m.id), role: m.role, content: m.content,
      time: dayjs(m.created_at).format('hh:mm A'),
    }));
    if (stored.length === 0) {
      const welcome: ChatMessage = {
        id: 'welcome', role: 'assistant',
        content: lc.welcome(patient.name || 'User'),
        time: dayjs().format('hh:mm A'),
      };
      setMessages([welcome]);
      // ✅ NO auto TTS here — user controls playback via 🔊 button
    } else {
      setMessages(stored);
    }
    return () => STTService.destroy();
  }, [patient?.id, language]);

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  const sendMessage = useCallback(async (text: string, isVoiceMode = false) => {
    const trimmed = text.trim();
    if (!trimmed || !patient || loading) return null;
    setInput('');
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user',
      content: trimmed, time: dayjs().format('hh:mm A'),
    };
    setMessages(prev => [...prev, userMsg]);
    if (sessionId) saveMessage(sessionId, 'user', trimmed);
    scrollToEnd();
    setLoading(true);
    try {
      let ctx = buildPatientContext(patient, language);
      const history = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
      const reply = await chatWithBot(history as any, ctx, isVoiceMode);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: reply, time: dayjs().format('hh:mm A'),
      };
      setMessages(prev => [...prev, botMsg]);
      if (sessionId) saveMessage(sessionId, 'assistant', reply);
      scrollToEnd();
      return reply;
    } catch {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: t('error_generic'),
        time: dayjs().format('hh:mm A'),
      };
      setMessages(prev => [...prev, errMsg]);
      return 'Sorry, I could not respond due to an error.';
    } finally {
      setLoading(false);
    }
  }, [messages, patient, language, sessionId, loading]);

  const toggleMic = () => {
    if (isListening) {
      STTService.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      STTService.onSpeechResults = (e: any) => {
        setIsListening(false);
        const text = e.value?.[0];
        if (text) sendMessage(text);
      };
      STTService.onSpeechError = () => setIsListening(false);
      STTService.start(locale);
    }
  };

  const handleSpeak = useCallback((text: string) => {
    TTSService.speak(text);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={colors.primaryDark} />
        </TouchableOpacity>
        <View style={styles.botInfo}>
          <View style={styles.botAvatar}><Icon name="robot-happy-outline" size={23} color="#fff" /></View>
          <View>
            <Text style={styles.botName}>MediSaaN Bot</Text>
            <Text style={styles.botStatus}>{lc.botStatus}</Text>
          </View>
        </View>
        {/* Voice mode button in header */}
        <TouchableOpacity
          style={styles.voiceModeBtn}
          onPress={() => {
            setVoiceModalVisible(true);
            setVoiceModeActive(true);
          }}
        >
          <Text style={styles.voiceModeBtnText}>Voice</Text>
        </TouchableOpacity>
      </View>

      {/* Patient context strip */}
      {patient && (
        <View style={styles.contextStrip}>
          <Text style={styles.contextText} numberOfLines={1}>
            {patient.name}, {patient.age}yr · {(patient.conditions || []).join(', ') || 'No conditions'}
          </Text>
        </View>
      )}

      {/* Quick prompts */}
      <View style={styles.promptsWrap}>
        <FlatList
          horizontal data={lc.quickPrompts} keyExtractor={i => i.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptsList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.promptChip} onPress={() => sendMessage(item.text)}>
              <Text style={styles.promptText}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={120}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => <Bubble msg={item} onSpeak={handleSpeak} />}
          ListFooterComponent={loading ? <TypingIndicator /> : null}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToEnd}
        />

        {/* Text input row */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={toggleMic}
            accessibilityLabel={isListening ? 'Stop listening' : 'Start voice input'}
          >
            <Icon name={isListening ? 'stop' : 'microphone'} size={22} color={isListening ? '#fff' : colors.primaryDark} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={isListening ? lc.listeningText : lc.typePlaceholder}
            placeholderTextColor={isListening ? colors.primary : colors.textMuted}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            editable={!isListening}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Icon name="send" size={19} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Full Screen Voice Modal ── */}
      <VoiceModal
        visible={voiceModalVisible}
        onClose={() => {
          setVoiceModalVisible(false);
          setVoiceModeActive(false);
          TTSService.stop();
        }}
        onSend={async (text) => {
          return await sendMessage(text, true);
        }}
        language={language}
        locale={locale}
        patientName={patient?.name ?? ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryLight },
  botInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  botAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  botName: { ...typography.headingSmall, color: colors.ink },
  botStatus: { ...typography.tiny, color: colors.success },
  voiceModeBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  voiceModeBtnText: { ...typography.caption, color: colors.primaryDark, fontWeight: '800' },
  contextStrip: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  contextText: { ...typography.caption, color: colors.primaryDark, fontWeight: '700' },
  promptsWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  promptsList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 8 },
  promptChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: colors.border,
  },
  promptText: { ...typography.caption, color: colors.textSecondary },
  messageList: { paddingVertical: spacing.lg, paddingBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    padding: spacing.md, paddingBottom: spacing.lg, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  micBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  micBtnActive: { backgroundColor: colors.primaryDark },
  input: {
    flex: 1, backgroundColor: colors.background,
    borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    ...typography.bodyMedium, color: colors.textPrimary, maxHeight: 100,
  },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
});
