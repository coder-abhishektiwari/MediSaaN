import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Animated,
  Modal, Dimensions, Easing,
} from 'react-native';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';
import { chatWithBot } from '../api/groq';
import { buildPatientContext } from '../utils/promptBuilder';
import { TTSService } from '../services/TTSService';
import { STTService } from '../services/STTService';
import { createSession, saveMessage, getMessages, getLastSession } from '../db/queries/chat';
import { colors, typography, spacing, borderRadius, sizes } from '../theme';
import dayjs from 'dayjs';

// ─── Language config ──────────────────────────────────────────────────────────
const LANG_CONFIG: Record<string, {
  welcome: (name: string) => string;
  quickPrompts: { id: string; label: string; text: string }[];
  voiceHint: string;
  listeningText: string;
  typePlaceholder: string;
  botStatus: string;
  tapToSpeak: string;
  interruptLabel: string;
  speakingLabel: string;
}> = {
  hi: {
    welcome: (name) =>
      `नमस्ते ${name}! 🙏 मैं आपका MediSaaN bot हूँ। आप मुझसे अपनी सेहत के बारे में कुछ भी पूछ सकते हैं।`,
    quickPrompts: [
      { id: 'forgot', label: '💊 दवा भूल गए', text: 'मैं अपनी दवा लेना भूल गया। मुझे क्या करना चाहिए?' },
      { id: 'pain', label: '🤕 दर्द है', text: 'मुझे दर्द हो रहा है। क्या करूँ?' },
      { id: 'side', label: '⚠️ साइड इफेक्ट', text: 'मेरी दवाओं के साइड इफेक्ट बताएं।' },
      { id: 'doctor', label: '👨‍⚕️ डॉक्टर कब?', text: 'मेरी स्थिति में डॉक्टर कब दिखाना चाहिए?' },
      { id: 'diet', label: '🥗 खान-पान', text: 'मेरी बीमारी में क्या खाना चाहिए?' },
    ],
    voiceHint: 'बोलने के लिए दबाएं',
    listeningText: 'सुन रहा हूँ...',
    typePlaceholder: 'टाइप करें या बोलें...',
    botStatus: '🟢 मदद के लिए तैयार',
    tapToSpeak: 'बात करने के लिए टैप करें',
    interruptLabel: 'रोकें',
    speakingLabel: 'बोल रहा हूँ...',
  },
  en: {
    welcome: (name) =>
      `Hello ${name}! 🙏 I am your MediSaaN bot. You can ask me anything about your health and I will help you!`,
    quickPrompts: [
      { id: 'forgot', label: '💊 Forgot medicine', text: 'I forgot to take my medicine. What should I do?' },
      { id: 'pain', label: '🤕 I have pain', text: 'I am having pain. What should I do?' },
      { id: 'side', label: '⚠️ Side effects?', text: 'Tell me about the side effects of my medicines.' },
      { id: 'doctor', label: '👨‍⚕️ When to see doctor?', text: 'When should I see a doctor based on my condition?' },
      { id: 'diet', label: '🥗 Diet advice', text: 'What diet should I follow for my health conditions?' },
    ],
    voiceHint: 'Press to speak',
    listeningText: 'Listening...',
    typePlaceholder: 'Type or speak your question...',
    botStatus: '🟢 Ready to help',
    tapToSpeak: 'Tap to talk',
    interruptLabel: 'Interrupt',
    speakingLabel: 'Speaking...',
  },
  pa: {
    welcome: (name) =>
      `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${name}! 🙏 ਮੈਂ ਤੁਹਾਡਾ MediSaaN bot ਹਾਂ। ਆਪਣੀ ਸਿਹਤ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ।`,
    quickPrompts: [
      { id: 'forgot', label: '💊 ਦਵਾਈ ਭੁੱਲੀ', text: 'ਮੈਂ ਦਵਾਈ ਲੈਣਾ ਭੁੱਲ ਗਿਆ। ਕੀ ਕਰਾਂ?' },
      { id: 'pain', label: '🤕 ਦਰਦ ਹੈ', text: 'ਮੈਨੂੰ ਦਰਦ ਹੋ ਰਿਹਾ ਹੈ। ਕੀ ਕਰਾਂ?' },
      { id: 'side', label: '⚠️ ਸਾਈਡ ਇਫੈਕਟ', text: 'ਮੇਰੀਆਂ ਦਵਾਈਆਂ ਦੇ ਸਾਈਡ ਇਫੈਕਟ ਦੱਸੋ।' },
      { id: 'doctor', label: '👨‍⚕️ ਡਾਕਟਰ ਕਦੋਂ?', text: 'ਮੈਨੂੰ ਡਾਕਟਰ ਕਦੋਂ ਮਿਲਣਾ ਚਾਹੀਦਾ?' },
      { id: 'diet', label: '🥗 ਖੁਰਾਕ ਸਲਾਹ', text: 'ਮੈਨੂੰ ਕੀ ਖਾਣਾ ਚਾਹੀਦਾ?' },
    ],
    voiceHint: 'ਬੋਲਣ ਲਈ ਦਬਾਓ',
    listeningText: 'ਸੁਣ ਰਿਹਾ ਹਾਂ...',
    typePlaceholder: 'ਟਾਈਪ ਕਰੋ ਜਾਂ ਬੋਲੋ...',
    botStatus: '🟢 ਮਦਦ ਲਈ ਤਿਆਰ',
    tapToSpeak: 'ਗੱਲ ਕਰਨ ਲਈ ਟੈਪ ਕਰੋ',
    interruptLabel: 'ਰੋਕੋ',
    speakingLabel: 'ਬੋਲ ਰਿਹਾ ਹਾਂ...',
  },
};

function getLangConfig(language: string) {
  return LANG_CONFIG[language] ?? LANG_CONFIG['en'];
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; time: string };

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({ msg, onSpeak }: { msg: ChatMessage; onSpeak: (t: string) => void }) {
  const isBot = msg.role === 'assistant';
  return (
    <View style={[bub.row, isBot ? bub.rowBot : bub.rowUser]}>
      {isBot && (
        <View style={bub.avatar}>
          <Text style={bub.avatarText}>M</Text>
        </View>
      )}
      <View style={[bub.bubble, isBot ? bub.bubbleBot : bub.bubbleUser]}>
        <Text style={[bub.text, isBot ? bub.textBot : bub.textUser]}>{msg.content}</Text>
        <View style={bub.footer}>
          <Text style={bub.time}>{msg.time}</Text>
          {isBot && (
            <TouchableOpacity onPress={() => onSpeak(msg.content)} style={bub.speakBtn}>
              <Text style={bub.speakIcon}>🔊</Text>
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
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bubble: { maxWidth: '78%', borderRadius: borderRadius.lg, padding: spacing.lg, gap: 6 },
  bubbleBot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  text: { ...typography.bodyMedium, lineHeight: 24 },
  textBot: { color: colors.textPrimary },
  textUser: { color: '#fff' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  time: { ...typography.tiny, color: colors.textMuted },
  speakBtn: { padding: 2 },
  speakIcon: { fontSize: 14 },
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
      <View style={ti.avatar}><Text style={ti.avatarText}>M</Text></View>
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
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bubble: { flexDirection: 'row', gap: 5, backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});

// ─── Voice Orb animation ──────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');

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

  const orbColor = state === 'idle' ? '#5B8AF5'
    : state === 'listening' ? '#22C55E'
      : state === 'speaking' ? '#F59E0B'
        : '#A78BFA'; // processing

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
        <Text style={vo.orbLetter}>M</Text>
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
  orbLetter: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1 },
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

function VoiceModal({ visible, onClose, onSend, language, locale, patientName }: VoiceModalProps) {
  const lc = getLangConfig(language);
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
      const t = setTimeout(() => startListening(), 400);
      return () => clearTimeout(t);
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
            <Text style={vm.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={vm.topTitle}>MediSaaN Voice</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Patient chip */}
        <View style={vm.patientChip}>
          <Text style={vm.patientChipText}>👤 {patientName}</Text>
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
              <Text style={vm.interruptText}>⏹ {lc.interruptLabel}</Text>
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
  const bars = Array.from({ length: 24 }, (_, i) => useRef(new Animated.Value(4)).current);
  useEffect(() => {
    if (active) {
      bars.forEach((b, i) => {
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
  }, [active]);

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
    backgroundColor: '#0A0A1A',   // deep dark — not pure black
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
  closeIcon: { fontSize: 18, color: '#fff', fontWeight: '600' },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },

  patientChip: {
    paddingHorizontal: 18, paddingVertical: 6,
    backgroundColor: 'rgba(91,138,245,0.15)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(91,138,245,0.35)',
    marginBottom: 12,
  },
  patientChipText: { color: '#7BA7FF', fontSize: 13, fontWeight: '500' },

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
  const { patient } = usePatientStore();
  const { language, locale } = useLanguageStore();
  const lc = getLangConfig(language);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

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
        content: lc.welcome(patient.name),
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
        content: 'Sorry, I could not respond. Please check your internet connection.',
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
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.botInfo}>
          <View style={styles.botAvatar}><Text style={styles.botAvatarText}>M</Text></View>
          <View>
            <Text style={styles.botName}>MediSaaN Bot</Text>
            <Text style={styles.botStatus}>{lc.botStatus}</Text>
          </View>
        </View>
        {/* Voice mode button in header */}
        <TouchableOpacity
          style={styles.voiceModeBtn}
          onPress={() => setVoiceModalVisible(true)}
        >
          <Text style={styles.voiceModeBtnText}>🎙 Voice</Text>
        </TouchableOpacity>
      </View>

      {/* Patient context strip */}
      {patient && (
        <View style={styles.contextStrip}>
          <Text style={styles.contextText} numberOfLines={1}>
            👤 {patient.name}, {patient.age}yr · {(patient.conditions || []).join(', ') || 'No conditions'}
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
            <Text style={styles.micIcon}>{isListening ? '⏹' : '🎙'}</Text>
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
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Full Screen Voice Modal ── */}
      <VoiceModal
        visible={voiceModalVisible}
        onClose={() => {
          setVoiceModalVisible(false);
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
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { ...typography.headingLarge, color: colors.primary },
  botInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  botAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  botAvatarText: { color: '#fff', ...typography.headingSmall },
  botName: { ...typography.headingSmall, color: colors.textPrimary },
  botStatus: { ...typography.tiny, color: colors.success },
  voiceModeBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  voiceModeBtnText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  contextStrip: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  contextText: { ...typography.caption, color: colors.primary },
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
    padding: spacing.md, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  micBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  micBtnActive: { backgroundColor: colors.primary },
  micIcon: { fontSize: 22 },
  input: {
    flex: 1, backgroundColor: colors.background,
    borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    ...typography.bodyMedium, color: colors.textPrimary, maxHeight: 100,
  },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
});