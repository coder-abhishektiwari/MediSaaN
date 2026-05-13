import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, Alert, ScrollView, Modal, Animated, Easing,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission, type CameraRef } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';
import { analyzeReport } from '../api/gemini';
import { saveScanResult, markScanAsSaved } from '../db/queries/reports';
import { compressAndEncode, savePermanentImage } from '../utils/imageUtils';
import { buildPatientContext } from '../utils/promptBuilder';
import { TTSService } from '../services/TTSService';
import { colors, typography, spacing, borderRadius, sizes, statusColors } from '../theme';

// ─── Stage messages per language ─────────────────────────────────────────────

type LangCode = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | string;

const STAGE_MESSAGES: Record<string, Record<LangCode, { label: string; sub: string; voice: string }>> = {
  capturing: {
    en: { label: 'Capturing report…',       sub: 'Keep the page flat & steady',             voice: 'Capturing the report, please hold steady.' },
    hi: { label: 'रिपोर्ट कैप्चर हो रही है…', sub: 'पेज को सीधा और स्थिर रखें',               voice: 'रिपोर्ट का फ़ोटो लिया जा रहा है, कृपया स्थिर रहें।' },
    bn: { label: 'রিপোর্ট তোলা হচ্ছে…',       sub: 'পৃষ্ঠাটি সমতল ও স্থির রাখুন',              voice: 'রিপোর্টের ছবি তোলা হচ্ছে, স্থির থাকুন।' },
    ta: { label: 'அறிக்கை படம் பிடிக்கிறது…',  sub: 'பக்கத்தை தட்டையாக வைக்கவும்',           voice: 'அறிக்கை படம் பிடிக்கப்படுகிறது, நிலையாக இருங்கள்.' },
    te: { label: 'నివేదిక తీస్తున్నారు…',       sub: 'పేజీని చదునుగా, స్థిరంగా ఉంచండి',         voice: 'నివేదిక తీస్తున్నారు, స్థిరంగా ఉండండి.' },
    mr: { label: 'अहवाल कॅप्चर होत आहे…',      sub: 'पान सपाट आणि स्थिर ठेवा',                voice: 'अहवालाचा फोटो घेत आहोत, कृपया स्थिर राहा.' },
    gu: { label: 'રિપોર્ટ કૅપ્ચર થઈ રહ્યો છે…', sub: 'પૃષ્ઠ સપાટ અને સ્થિર રાખો',              voice: 'રિપોર્ટ કૅપ્ચર થઈ રહ્યો છે, સ્થિર રહો.' },
  },
  validating: {
    en: { label: 'Validating report…',       sub: 'Checking if this is a medical report',    voice: 'Checking if this is a valid medical report.' },
    hi: { label: 'रिपोर्ट सत्यापित हो रही है…', sub: 'जाँच हो रही है यह मेडिकल रिपोर्ट है',  voice: 'जाँच हो रही है कि यह मेडिकल रिपोर्ट है या नहीं।' },
    bn: { label: 'রিপোর্ট যাচাই হচ্ছে…',       sub: 'এটি মেডিকেল রিপোর্ট কিনা যাচাই হচ্ছে',  voice: 'যাচাই করা হচ্ছে এটি মেডিকেল রিপোর্ট কিনা।' },
    ta: { label: 'அறிக்கை சரிபார்க்கிறது…',    sub: 'இது மருத்துவ அறிக்கையா என சரிபார்க்கிறோம்', voice: 'இது மருத்துவ அறிக்கையா என சரிபார்க்கிறோம்.' },
    te: { label: 'నివేదిక ధృవీకరిస్తున్నారు…',  sub: 'ఇది వైద్య నివేదికా అని తనిఖీ చేస్తున్నారు', voice: 'ఇది వైద్య నివేదికా అని తనిఖీ చేస్తున్నారు.' },
    mr: { label: 'अहवाल सत्यापित होत आहे…',    sub: 'हे वैद्यकीय अहवाल आहे का ते तपासत आहोत', voice: 'हा वैद्यकीय अहवाल आहे का ते तपासत आहोत.' },
    gu: { label: 'રિપોર્ટ ચકાસી રહ્યા છીએ…',   sub: 'આ તબીબી રિપોર્ટ છે કે નહીં ચકાસી રહ્યા', voice: 'આ તબીબી રિપોર્ટ છે કે નહીં ચકાસી રહ્યા છીએ.' },
  },
  processing: {
    en: { label: 'Reading your report…',     sub: 'Analyzing test values & parameters',      voice: 'Reading your report and analyzing test values.' },
    hi: { label: 'रिपोर्ट पढ़ रहे हैं…',      sub: 'टेस्ट के मान और पैरामीटर विश्लेषण हो रहे हैं', voice: 'रिपोर्ट पढ़ी जा रही है और परीक्षण मानों का विश्लेषण किया जा रहा है।' },
    bn: { label: 'রিপোর্ট পড়া হচ্ছে…',        sub: 'পরীক্ষার মান ও প্যারামিটার বিশ্লেষণ হচ্ছে', voice: 'রিপোর্ট পড়া হচ্ছে এবং পরীক্ষার মান বিশ্লেষণ করা হচ্ছে।' },
    ta: { label: 'அறிக்கை படிக்கப்படுகிறது…',  sub: 'சோதனை மதிப்புகள் பகுப்பாய்வு செய்யப்படுகின்றன', voice: 'உங்கள் அறிக்கை படிக்கப்படுகிறது மற்றும் சோதனை மதிப்புகள் பகுப்பாய்வு செய்யப்படுகின்றன.' },
    te: { label: 'నివేదిక చదువుతున్నారు…',      sub: 'పరీక్ష విలువలు మరియు పారామీటర్లు విశ్లేషిస్తున్నారు', voice: 'మీ నివేదిక చదువుతున్నారు మరియు పరీక్ష విలువలు విశ్లేషిస్తున్నారు.' },
    mr: { label: 'अहवाल वाचत आहोत…',          sub: 'चाचणी मूल्ये आणि पॅरामीटर्स विश्लेषण होत आहे', voice: 'तुमचा अहवाल वाचत आहोत आणि चाचणी मूल्यांचे विश्लेषण होत आहे.' },
    gu: { label: 'રિપોર્ટ વાંચી રહ્યા છીએ…',   sub: 'ટેસ્ટ મૂલ્યો અને પૅરાమీટર્સ વિશ્લેષણ થઈ રહ્યું છે', voice: 'રિપોર્ટ વાંચી રહ્યા છીએ आणि ટેસ્ટ મૂલ્યોનું વિશ્લેષણ થઈ રહ્યું છે.' },
  },
};

function getMsg(stage: string, lang: string) {
  const stageMap = STAGE_MESSAGES[stage];
  if (!stageMap) return null;
  return stageMap[lang] ?? stageMap['en'];
}

// ─── Animated scanning overlay ───────────────────────────────────────────────

function ScanningOverlay({ stage, lang }: { stage: string; lang: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const spin  = useRef(new Animated.Value(0)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.22, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();

    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
    );
    spinLoop.start();

    return () => { pulseLoop.stop(); spinLoop.stop(); };
  }, [stage]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const stageEmoji: Record<string, string> = {
    capturing:  '📄',
    validating: '🔍',
    processing: '🔬',
  };

  const msg = getMsg(stage, lang);
  const stageOrder = ['capturing', 'validating', 'processing'];

  return (
    <Animated.View style={[so.overlay, { opacity: fade }]}>
      <View style={so.bgRing3} />
      <View style={so.bgRing2} />
      <View style={so.bgRing1} />
      <Animated.View style={[so.pulseRing, { transform: [{ scale: pulse }] }]} />
      <Animated.View style={[so.spinner, { transform: [{ rotate }] }]} />
      <View style={so.iconCircle}>
        <Text style={so.iconEmoji}>{stageEmoji[stage] ?? '⏳'}</Text>
      </View>
      <View style={so.textBlock}>
        <Text style={so.label}>{msg?.label ?? '…'}</Text>
        <Text style={so.sub}>{msg?.sub ?? ''}</Text>
      </View>
      <View style={so.dots}>
        {stageOrder.map((s, i) => (
          <View
            key={s}
            style={[
              so.dot,
              s === stage && so.dotActive,
              stageOrder.indexOf(stage) > i && so.dotDone,
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const RING = 140;
const so = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.93)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    gap: 24,
  },
  bgRing3: { position: 'absolute', width: RING + 140, height: RING + 140, borderRadius: (RING + 140) / 2, backgroundColor: 'rgba(59,130,246,0.04)' },
  bgRing2: { position: 'absolute', width: RING + 80,  height: RING + 80,  borderRadius: (RING + 80) / 2,  backgroundColor: 'rgba(59,130,246,0.06)' },
  bgRing1: { position: 'absolute', width: RING + 30,  height: RING + 30,  borderRadius: (RING + 30) / 2,  backgroundColor: 'rgba(59,130,246,0.09)' },
  pulseRing: {
    position: 'absolute',
    width: RING + 10, height: RING + 10,
    borderRadius: (RING + 10) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.35)',
  },
  spinner: {
    position: 'absolute',
    width: RING + 20, height: RING + 20,
    borderRadius: (RING + 20) / 2,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#3B82F6',
    borderRightColor: 'rgba(59,130,246,0.3)',
  },
  iconCircle: {
    width: RING, height: RING,
    borderRadius: RING / 2,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: { fontSize: 52 },
  textBlock: { alignItems: 'center', gap: 8, paddingHorizontal: 40 },
  label: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', letterSpacing: 0.3 },
  sub:   { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dot:       { width: 8,  height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
  dotDone:   { width: 8,  height: 8, borderRadius: 4, backgroundColor: 'rgba(59,130,246,0.5)' },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const SEVERITY_ICONS: Record<string, string> = {
  normal: '✅', mild_concern: '⚠️', needs_attention: '🔴', urgent: '🚨',
};
const SEVERITY_COLORS: Record<string, string> = {
  normal: colors.success, mild_concern: colors.warning,
  needs_attention: colors.danger, urgent: '#922B21',
};

function ParameterRow({ param, t }: { param: any; t: any }) {
  const sc = statusColors[param.status as keyof typeof statusColors] || statusColors.normal;
  const statusLabel = param.status === 'normal' ? t('status_normal') : param.status === 'high' ? t('status_high') : param.status === 'low' ? t('status_low') : param.status;
  return (
    <View style={pr.row}>
      <View style={pr.left}>
        <Text style={pr.name}>{param.name}</Text>
        <Text style={pr.meaning} numberOfLines={2}>{param.meaning}</Text>
      </View>
      <View style={pr.mid}>
        <Text style={pr.value}>{param.value} {param.unit}</Text>
        <Text style={pr.range}>{t('normal_range')}: {param.normal_range}</Text>
      </View>
      <View style={[pr.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
        <Text style={[pr.badgeText, { color: sc.text }]}>{statusLabel?.toUpperCase()}</Text>
      </View>
    </View>
  );
}
const pr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  left: { flex: 2 }, mid: { flex: 1.5 },
  name: { ...typography.labelMedium, color: colors.textPrimary },
  meaning: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  value: { ...typography.labelMedium, color: colors.textPrimary },
  range: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full, borderWidth: 1, minWidth: 60, alignItems: 'center' },
  badgeText: { ...typography.tiny, fontWeight: '800' },
});

function InfoSection({ icon, title, content }: { icon: string; title: string; content: string }) {
  if (!content) return null;
  return (
    <View style={inf.wrap}>
      <View style={inf.header}>
        <Text style={inf.icon}>{icon}</Text>
        <Text style={inf.title}>{title}</Text>
      </View>
      <Text style={inf.content}>{content}</Text>
    </View>
  );
}
const inf = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { fontSize: 20 },
  title: { ...typography.headingSmall, color: colors.textPrimary },
  content: { ...typography.bodyMedium, color: colors.textSecondary, lineHeight: 26 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const FRAME_W = 300;
const FRAME_H = 200;
const FRAME_ACTIVE_COLOR = '#22C55E';
const FRAME_ERROR_COLOR  = '#EF4444';

type FrameState      = 'empty' | 'candidate' | 'invalid';
type ProcessingStage = 'idle' | 'capturing' | 'validating' | 'processing';

export default function ReportScanScreen({ navigation }: any) {
  const { t } = useTranslation();
  const device      = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<CameraRef>(null);

  const { patient }  = usePatientStore();
  const { language } = useLanguageStore();

  const isFocused = useIsFocused();
  const [isCameraActive, setIsCameraActive]   = useState(true);
  const [images, setImages]                   = useState<string[]>([]);
  const [askMorePages, setAskMorePages]        = useState(false);
  const [result, setResult]                   = useState<any>(null);
  const [currentScanId, setCurrentScanId]     = useState<number | null>(null);
  const [isSavedToProfile, setIsSavedToProfile] = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [showDetailed, setShowDetailed]       = useState(false);
  const [scanStatus, setScanStatus]           = useState(t('report_scan_instruction'));
  const [frameState, setFrameState]           = useState<FrameState>('empty');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!isFocused || !!result) TTSService.stop();
    return () => TTSService.stop();
  }, [isFocused, !!result]);

  useEffect(() => {
    setIsCameraActive(!result && !askMorePages && !loading);
  }, [result, askMorePages, loading]);

  useEffect(() => {
    if (processingStage === 'idle') return;
    const msg = getMsg(processingStage, language);
    if (msg?.voice) TTSService.speak(msg.voice);
  }, [processingStage, language]);

  const handleCapture = useCallback(async () => {
    if (!camera.current) return;
    try {
      setLoading(true);
      setProcessingStage('capturing');
      setScanStatus(t('loading'));
      const photo = await camera.current.takePhoto({ flash: 'off', enableShutterSound: true });
      const uri = 'file://' + photo.path;
      setImages(prev => [...prev, uri]);
      setLoading(false);
      setProcessingStage('idle');
      setAskMorePages(true);
    } catch {
      setLoading(false);
      setProcessingStage('idle');
    }
  }, [t]);

  const reset = () => {
    setResult(null);
    setImages([]);
    setFrameState('empty');
    setScanStatus(t('report_scan_instruction'));
    setIsCameraActive(true);
    setCurrentScanId(null);
    setIsSavedToProfile(false);
  };

  const toggleSaveReport = () => {
    if (currentScanId) {
      const newState = !isSavedToProfile;
      markScanAsSaved(currentScanId, newState);
      setIsSavedToProfile(newState);
      if (newState) {
        Alert.alert(t('done'), t('save_report'));
      }
    }
  };

  const handleGallery = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 5 });
    if (res.assets?.length) {
      const uris = res.assets.map(a => a.uri!).filter(Boolean);
      setImages(uris);
      await analyze(uris);
    }
  };

  const analyze = useCallback(async (imgs: string[], silentNotReport = false, encodedImages?: string[]) => {
    if (!patient) { Alert.alert(t('error_generic'), t('note_empty')); return; }
    setAskMorePages(false);
    setLoading(true);
    setProcessingStage('validating');
    try {
      setScanStatus(t('loading'));
      const permUris = await Promise.all(imgs.map(uri => savePermanentImage(uri)));
      const encoded = encodedImages || await Promise.all(permUris.map(uri => compressAndEncode(uri)));
      const ctx  = buildPatientContext(patient, language);
      const data = await analyzeReport(encoded, ctx);

      if (!data.is_report) {
        const message = data.not_report_message || t('error_generic');
        setFrameState('invalid');
        setScanStatus(message);
        TTSService.speak(message);
        if (!silentNotReport) Alert.alert(t('error_generic'), message);
        return;
      }

      setProcessingStage('processing');
      setScanStatus(t('reading_report'));
      await new Promise(r => setTimeout(r, 1000));

      setResult(data);
      setFrameState('candidate');
      setScanStatus(t('status_normal'));
      TTSService.speak(data.simple_verdict);
      if (patient.id) {
        const id = saveScanResult(patient.id, 'report', permUris[0], JSON.stringify(data), data.severity || 'normal', false);
        setCurrentScanId(id ?? null);
        setIsSavedToProfile(false);
      }
    } catch (e: any) {
      if (!silentNotReport) {
        const msg = e.message || t('error_generic');
        Alert.alert(t('error_generic'), msg);
        TTSService.speak(msg);
      }
      setFrameState('invalid');
      setScanStatus(t('report_scan_instruction'));
    } finally {
      setLoading(false);
      setProcessingStage('idle');
      isScanningRef.current = false;
    }
  }, [language, patient, t]);

  const handleScanAgain = () => {
    reset();
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permWrap}>
          <Text style={styles.permEmoji}>📋</Text>
          <Text style={styles.permTitle}>{t('perm_camera')}</Text>
          <Text style={styles.permSub}>{t('perm_camera_sub')}</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>{t('perm_allow')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sevColor = result ? (SEVERITY_COLORS[result.severity] || colors.success) : colors.success;
  const sevIcon  = result ? (SEVERITY_ICONS[result.severity]  || '✅')            : '✅';
  const frameColor = frameState === 'candidate' ? FRAME_ACTIVE_COLOR : FRAME_ERROR_COLOR;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {device && isCameraActive && (
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isCameraActive && isFocused}
          photo={true}
        />
      )}

      {!result && !askMorePages && !loading && (
        <>
          <View style={styles.overlayTop}>
            <SafeAreaView>
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.topTitle}>
                  {t('report_analyze')}{images.length > 0 ? ` (${images.length})` : ''}
                </Text>
                <View style={{ width: 44 }} />
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.frameWrap}>
            <View style={[styles.frameRect, { borderColor: frameColor }]}>
              {(['TL','TR','BL','BR'] as const).map(c => (
                <View
                  key={c}
                  style={[
                    styles.corner, { borderColor: frameColor },
                    c==='TL' ? styles.cornerTL : c==='TR' ? styles.cornerTR : c==='BL' ? styles.cornerBL : styles.cornerBR,
                  ]}
                />
              ))}
            </View>
            <View style={[styles.scanTooltip, frameState === 'candidate' ? styles.scanTooltipGood : styles.scanTooltipBad]}>
              <Text style={styles.scanTooltipText}>{scanStatus}</Text>
            </View>
          </View>

          <View style={styles.overlayBottom}>
            <View style={styles.controls}>
              <TouchableOpacity onPress={handleGallery} style={styles.sideBtn}>
                <Text style={styles.sideBtnIcon}>🖼</Text>
                <Text style={styles.sideBtnLabel}>{t('gallery')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCapture} style={styles.captureBtn}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
              <View style={{ width: 60 }} />
            </View>
          </View>
        </>
      )}

      {loading && processingStage !== 'idle' && (
        <ScanningOverlay stage={processingStage} lang={language} />
      )}

      {askMorePages && (
        <View style={styles.morePageOverlay}>
          <View style={styles.morePageBox}>
            <Text style={styles.morePageEmoji}>📄</Text>
            <Text style={styles.morePageTitle}>{t('more_pages')}</Text>
            <Text style={styles.morePageSub}>{images.length} {t('pages')}</Text>
            <View style={styles.morePageBtns}>
              <TouchableOpacity style={styles.morePageYes} onPress={() => setAskMorePages(false)}>
                <Text style={styles.morePageYesText}>📷 {t('yes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.morePageNo} onPress={() => analyze(images)}>
                <Text style={styles.morePageNoText}>✓ {t('no')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {result && !showDetailed && (
        <View style={styles.resultOverlay}>
          <SafeAreaView style={{ flex: 1 }} />
          <View style={styles.simpleResult}>
            <View style={styles.handle} />
            <View style={[styles.sevCard, { backgroundColor: sevColor + '15', borderColor: sevColor + '40' }]}>
              <Text style={styles.sevIcon}>{sevIcon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sevTitle, { color: sevColor }]}>
                  {result.severity?.replace('_', ' ').toUpperCase()}
                </Text>
                <Text style={styles.verdict}>{result.simple_verdict}</Text>
              </View>
            </View>
            <View style={styles.simpleActions}>
              <TouchableOpacity style={[styles.speakBtn, isSavedToProfile && { backgroundColor: colors.success }]} onPress={toggleSaveReport}>
                <Text style={styles.speakBtnText}>{isSavedToProfile ? t('done') : `➕ ${t('save_report')}`}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreBtn} onPress={() => setShowDetailed(true)}>
                <Text style={styles.moreBtnText}>{t('full_report')} →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAgain}>
              <Text style={styles.scanAgainText}>Scan Another Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Detailed modal */}
      {result && showDetailed && (
        <Modal visible animationType="slide">
          <SafeAreaView style={styles.detailedSafe}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.detailedHeader}>
              <TouchableOpacity onPress={() => setShowDetailed(false)}>
                <Text style={styles.detailedBack}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.detailedTitle}>Report Analysis</Text>
              <View style={{ width: 60 }} />
            </View>
            <ScrollView contentContainerStyle={styles.detailedScroll} showsVerticalScrollIndicator={false}>
              <View style={[styles.verdictBanner, { backgroundColor: sevColor }]}>
                <Text style={styles.verdictIcon}>{sevIcon}</Text>
                <Text style={styles.verdictText}>{result.simple_verdict}</Text>
              </View>
              {result.parameters?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📊 Test Parameters</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCell, { flex: 2 }]}>Parameter</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>Your Value</Text>
                    <Text style={[styles.thCell, { flex: 1 }]}>Status</Text>
                  </View>
                  {result.parameters.map((p: any, i: number) => <ParameterRow key={i} param={p} />)}
                </View>
              )}
              <View style={styles.infoSections}>
                <InfoSection icon="🔍" title="Findings"        content={result.possible_conditions} />
                <InfoSection icon="🥗" title="Diet Advice"     content={result.diet_advice} />
                <InfoSection icon="🏃" title="Lifestyle"       content={result.lifestyle_advice} />
                <InfoSection icon="👨‍⚕️" title="Consult Doctor" content={result.specialist_to_see} />
                <InfoSection icon="🗓" title="Next Test When"  content={result.follow_up_when} />
                {result.urgent_action && (
                  <View style={styles.urgentBox}>
                    <Text style={styles.urgentTitle}>🚨 Urgent Action Required</Text>
                    <Text style={styles.urgentText}>{result.urgent_action}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1, backgroundColor: colors.background },
  permWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl, gap: spacing.lg },
  permEmoji: { fontSize: 64 },
  permTitle: { ...typography.headingLarge, color: colors.textPrimary, textAlign: 'center' },
  permSub: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
  permBtn: { backgroundColor: colors.primary, height: sizes.buttonHeight, paddingHorizontal: 32, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  permBtnText: { ...typography.labelLarge, color: '#fff' },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 18 },
  topTitle: { ...typography.headingSmall, color: '#fff' },
  frameWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  frameRect: { width: FRAME_W, height: FRAME_H, position: 'relative', borderWidth: 1.5, borderRadius: borderRadius.sm },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanTooltip: { maxWidth: FRAME_W + 24, marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, borderWidth: 1 },
  scanTooltipGood: { backgroundColor: 'rgba(34,197,94,0.18)', borderColor: 'rgba(34,197,94,0.65)' },
  scanTooltipBad:  { backgroundColor: 'rgba(239,68,68,0.2)',  borderColor: 'rgba(239,68,68,0.7)' },
  scanTooltipText: { ...typography.caption, color: '#fff', textAlign: 'center' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingBottom: 40, zIndex: 10 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: spacing.xl },
  sideBtn: { width: 60, alignItems: 'center' },
  sideBtnIcon: { fontSize: 28 },
  sideBtnLabel: { ...typography.tiny, color: '#fff', marginTop: 4 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  morePageOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  morePageBox: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 40, alignItems: 'center', gap: spacing.lg, margin: spacing.xl },
  morePageEmoji: { fontSize: 52 },
  morePageTitle: { ...typography.headingMedium, color: colors.textPrimary, textAlign: 'center' },
  morePageSub: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
  morePageBtns: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  morePageYes: { flex: 1, height: 52, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  morePageYesText: { ...typography.labelMedium, color: colors.primary },
  morePageNo: { flex: 1, height: 52, borderRadius: borderRadius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  morePageNoText: { ...typography.labelMedium, color: '#fff' },
  resultOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 15 },
  simpleResult: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, padding: spacing.xxl, gap: spacing.lg, elevation: 20 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  sevCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, borderRadius: borderRadius.md, padding: spacing.lg, borderWidth: 1.5 },
  sevIcon: { fontSize: 40 },
  sevTitle: { ...typography.labelLarge, fontWeight: '800', marginBottom: 4 },
  verdict: { ...typography.bodyLarge, color: colors.textSecondary, lineHeight: 26 },
  simpleActions: { flexDirection: 'row', gap: spacing.md },
  speakBtn: { flex: 1, height: 46, borderRadius: borderRadius.sm, borderWidth: 1.5, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  speakBtnText: { ...typography.labelMedium, color: colors.primary },
  moreBtn: { flex: 1, height: 46, borderRadius: borderRadius.sm, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  moreBtnText: { ...typography.labelMedium, color: colors.primaryDark },
  scanAgainBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  scanAgainText: { ...typography.bodyMedium, color: colors.textSecondary },
  detailedSafe: { flex: 1, backgroundColor: colors.background },
  detailedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailedBack: { ...typography.bodyMedium, color: colors.primary },
  detailedTitle: { ...typography.headingSmall, color: colors.textPrimary },
  detailedScroll: { gap: spacing.lg, padding: spacing.xl, paddingBottom: 60 },
  verdictBanner: { borderRadius: borderRadius.md, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  verdictIcon: { fontSize: 40 },
  verdictText: { ...typography.bodyLarge, color: '#fff', flex: 1, lineHeight: 26 },
  section: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { ...typography.headingSmall, color: colors.textPrimary, marginBottom: spacing.md },
  tableHeader: { flexDirection: 'row', paddingBottom: spacing.sm, borderBottomWidth: 1.5, borderBottomColor: colors.border },
  thCell: { ...typography.tiny, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  infoSections: { gap: spacing.md },
  urgentBox: { backgroundColor: colors.dangerLight, borderRadius: borderRadius.md, padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.danger },
  urgentTitle: { ...typography.labelLarge, color: colors.danger, marginBottom: spacing.sm },
  urgentText: { ...typography.bodyMedium, color: colors.textSecondary },
});