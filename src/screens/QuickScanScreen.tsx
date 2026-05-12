import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, Alert, ScrollView, Modal, Animated, Easing,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission, type CameraRef } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { usePatientStore } from '../store/patientStore';
import { useLanguageStore } from '../store/languageStore';
import { scanMedicine } from '../api/gemini';
import { saveScanResult } from '../db/queries/reports';
import { addMedicine, getMedicines } from '../db/queries/medicines';
import { compressAndEncode, savePermanentImage } from '../utils/imageUtils';
import { buildPatientContext } from '../utils/promptBuilder';
import { TTSService } from '../services/TTSService';
import { colors, typography, spacing, borderRadius, sizes } from '../theme';

// ─── Stage messages per language ────────────────────────────────────────────

type LangCode = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | string;

const STAGE_MESSAGES: Record<string, Record<LangCode, { label: string; sub: string; voice: string }>> = {
  capturing: {
    en: { label: 'Capturing image…',      sub: 'Hold the medicine steady',              voice: 'Capturing image, please hold steady.' },
    hi: { label: 'फ़ोटो ले रहे हैं…',        sub: 'दवाई को स्थिर रखें',                    voice: 'फ़ोटो ली जा रही है, कृपया स्थिर रहें।' },
    bn: { label: 'ছবি তোলা হচ্ছে…',         sub: 'ওষুধটি স্থির রাখুন',                    voice: 'ছবি তোলা হচ্ছে, স্থির থাকুন।' },
    ta: { label: 'புகைப்படம் எடுக்கிறது…',  sub: 'மருந்தை நிலையாக வைக்கவும்',            voice: 'படம் எடுக்கப்படுகிறது, நிலையாக இருங்கள்.' },
    te: { label: 'చిత్రం తీస్తున్నారు…',    sub: 'మందును స్థిరంగా పట్టుకోండి',            voice: 'చిత్రం తీస్తున్నారు, స్థిరంగా ఉండండి.' },
    mr: { label: 'फोटो घेत आहोत…',          sub: 'औषध स्थिर ठेवा',                        voice: 'फोटो घेत आहोत, कृपया स्थिर राहा.' },
    gu: { label: 'ફોટો લઈ રહ્યા છીએ…',     sub: 'દવાઈ સ્થિર રાખો',                       voice: 'ફોટો લઈ રહ્યા છીએ, સ્થિર રહો.' },
  },
  validating: {
    en: { label: 'Checking medicine…',    sub: 'Verifying what you scanned',            voice: 'Checking if this is a medicine.' },
    hi: { label: 'दवाई जाँच रहे हैं…',     sub: 'स्कैन की पुष्टि हो रही है',             voice: 'जाँच हो रही है कि यह दवाई है या नहीं।' },
    bn: { label: 'ওষুধ যাচাই হচ্ছে…',      sub: 'স্ক্যান যাচাই করা হচ্ছে',               voice: 'যাচাই করা হচ্ছে এটি ওষুধ কিনা।' },
    ta: { label: 'மருந்து சரிபார்க்கிறது…', sub: 'ஸ்கேன் சரிபார்க்கப்படுகிறது',         voice: 'இது மருந்தா என சரிபார்க்கிறோம்.' },
    te: { label: 'మందు తనిఖీ చేస్తున్నారు…', sub: 'స్కాన్ ధృవీకరించబడుతోంది',             voice: 'ఇది మందు అవునా అని తనిఖీ చేస్తున్నాం.' },
    mr: { label: 'औषध तपासत आहोत…',        sub: 'स्कॅन सत्यापित होत आहे',               voice: 'हे औषध आहे का ते तपासत आहोत.' },
    gu: { label: 'દવાઈ ચકાસી રહ્યા છીએ…', sub: 'સ્કેન ચકાસી રહ્યા છીએ',                voice: 'આ દવાઈ છે કે નહીં તે ચકાસી રહ્યા છીએ.' },
  },
  processing: {
    en: { label: 'Identifying medicine…', sub: 'Reading composition & dosage',          voice: 'Identifying the medicine, please wait.' },
    hi: { label: 'दवाई पहचान रहे हैं…',   sub: 'संरचना और खुराक पढ़ रहे हैं',           voice: 'दवाई की पहचान हो रही है, कृपया प्रतीक्षा करें।' },
    bn: { label: 'ওষুধ সনাক্ত হচ্ছে…',    sub: 'রচনা ও মাত্রা পড়া হচ্ছে',              voice: 'ওষুধ সনাক্ত হচ্ছে, অপেক্ষা করুন।' },
    ta: { label: 'மருந்து கண்டறிகிறது…',   sub: 'கலவை மற்றும் அளவு படிக்கப்படுகிறது',  voice: 'மருந்து கண்டறியப்படுகிறது, காத்திருங்கள்.' },
    te: { label: 'మందు గుర్తిస్తున్నారు…', sub: 'కూర్పు మరియు మోతాదు చదువుతున్నారు',   voice: 'మందు గుర్తిస్తున్నారు, దయచేసి వేచి ఉండండి.' },
    mr: { label: 'औषध ओळखत आहोत…',        sub: 'संरचना आणि मात्रा वाचत आहोत',          voice: 'औषध ओळखले जात आहे, कृपया थांबा.' },
    gu: { label: 'દવાઈ ઓળખી રહ્યા છીએ…', sub: 'રચના અને ડોઝ વાંચી રહ્યા છીએ',         voice: 'દવાઈ ઓળખી રહ્યા છીએ, રાહ જુઓ.' },
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
    // Fade in
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Pulse ring
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.25, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();

    // Spinner
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
    );
    spinLoop.start();

    return () => { pulseLoop.stop(); spinLoop.stop(); };
  }, [stage]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const stageEmoji: Record<string, string> = {
    capturing: '📷',
    validating: '🔍',
    processing: '💊',
  };

  const msg = getMsg(stage, lang);

  return (
    <Animated.View style={[so.overlay, { opacity: fade }]}>
      {/* Radial gradient-like background rings */}
      <View style={so.bgRing3} />
      <View style={so.bgRing2} />
      <View style={so.bgRing1} />

      {/* Outer pulse ring */}
      <Animated.View style={[so.pulseRing, { transform: [{ scale: pulse }] }]} />

      {/* Spinner arc */}
      <Animated.View style={[so.spinner, { transform: [{ rotate }] }]} />

      {/* Center icon */}
      <View style={so.iconCircle}>
        <Text style={so.iconEmoji}>{stageEmoji[stage] ?? '⏳'}</Text>
      </View>

      {/* Text */}
      <View style={so.textBlock}>
        <Text style={so.label}>{msg?.label ?? '…'}</Text>
        <Text style={so.sub}>{msg?.sub ?? ''}</Text>
      </View>

      {/* Progress dots */}
      <View style={so.dots}>
        {['capturing', 'validating', 'processing'].map((s, i) => (
          <View
            key={s}
            style={[
              so.dot,
              s === stage   && so.dotActive,
              ['capturing','validating','processing'].indexOf(stage) > i && so.dotDone,
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
  bgRing3: { position: 'absolute', width: RING + 140, height: RING + 140, borderRadius: (RING + 140) / 2, backgroundColor: 'rgba(34,197,94,0.04)' },
  bgRing2: { position: 'absolute', width: RING + 80,  height: RING + 80,  borderRadius: (RING + 80) / 2,  backgroundColor: 'rgba(34,197,94,0.06)' },
  bgRing1: { position: 'absolute', width: RING + 30,  height: RING + 30,  borderRadius: (RING + 30) / 2,  backgroundColor: 'rgba(34,197,94,0.09)' },
  pulseRing: {
    position: 'absolute',
    width: RING + 10, height: RING + 10,
    borderRadius: (RING + 10) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  spinner: {
    position: 'absolute',
    width: RING + 20, height: RING + 20,
    borderRadius: (RING + 20) / 2,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#22C55E',
    borderRightColor: 'rgba(34,197,94,0.3)',
  },
  iconCircle: {
    width: RING, height: RING,
    borderRadius: RING / 2,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(34,197,94,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: { fontSize: 52 },
  textBlock: { alignItems: 'center', gap: 8, paddingHorizontal: 40 },
  label: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', letterSpacing: 0.3 },
  sub:   { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: '#22C55E', width: 24, borderRadius: 4 },
  dotDone:  { backgroundColor: 'rgba(34,197,94,0.5)' },
});

// ─── HOW_TO_LABEL helper ─────────────────────────────────────────────────────

function HOW_TO_LABEL(val: string) {
  const m: Record<string, string> = {
    before_food: '🍽 Before Food',
    after_food:  '🍽 After Food',
    with_food:   '🍽 With Food',
    anytime:     '⏰ Anytime',
  };
  return m[val] || val;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

const TABS = ['Uses', 'Dosage', 'Side Effects', 'Warnings', 'How to Take'];
type FrameState     = 'empty' | 'candidate' | 'invalid';
type ProcessingStage = 'idle' | 'capturing' | 'validating' | 'processing';

const FRAME_ACTIVE_COLOR = '#22C55E';
const FRAME_ERROR_COLOR  = '#EF4444';
const FRAME = 240;

export default function QuickScanScreen({ navigation }: any) {
  const device      = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<CameraRef>(null);

  const { patient }  = usePatientStore();
  const { language } = useLanguageStore();

  const isFocused = useIsFocused();
  const [isCameraActive, setIsCameraActive]   = useState(true);   // internal state for results
  const [loading, setLoading]                 = useState(false);
  const [result, setResult]                   = useState<any>(null);
  const [showDetailed, setShowDetailed]       = useState(false);
  const [activeTab, setActiveTab]             = useState(0);
  const [scanStatus, setScanStatus]           = useState('Place a medicine in the frame');
  const [frameState, setFrameState]           = useState<FrameState>('empty');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [isAlreadyInSchedule, setIsAlreadyInSchedule] = useState(false);
  const isScanningRef = useRef(false);

  // Turn camera off when a result is showing or detailed modal is open
  // Stop voice and camera when screen is not focused or unmounted
  useEffect(() => {
    if (!isFocused) TTSService.stop();
    return () => TTSService.stop();
  }, [isFocused]);

  useEffect(() => {
    setIsCameraActive(!result );
  }, [result]);

  // Speak stage change
  useEffect(() => {
    if (processingStage === 'idle') return;
    const msg = getMsg(processingStage, language);
    if (msg?.voice) TTSService.speak(msg.voice);
  }, [processingStage, language]);

  const processImage = useCallback(async (uri: string, silentNotMedicine = false, encodedImage?: string) => {
    if (!patient) { Alert.alert('Error', 'Patient profile not found.'); setLoading(false); return; }
    try {
      setLoading(true);
      setProcessingStage('processing');
      setScanStatus('Searching for medicine…');
      const permUri = await savePermanentImage(uri);
      const base64 = encodedImage || await compressAndEncode(permUri);
      const ctx    = buildPatientContext(patient, language);
      const data   = await scanMedicine(base64, ctx);
      if (!data.is_medicine) {
        const message = data.not_medicine_message || 'This is not a medicine. Please align properly.';
        setFrameState('invalid');
        setScanStatus(message);
        TTSService.speak(message);
        return;
      }
      setResult(data);
      setFrameState('candidate');
      setScanStatus('Medicine detected');
      TTSService.speak(data.simple_description || data.medicine_name);
      if (patient.id) {
        saveScanResult(patient.id, 'medicine', permUri, JSON.stringify(data), 'normal', false);
        const currentMeds = getMedicines(patient.id);
        const exists = currentMeds.some((m: any) => m.name.toLowerCase() === data.medicine_name.toLowerCase());
        setIsAlreadyInSchedule(exists);
      }
    } catch (e: any) {
      if (!silentNotMedicine) {
        const msg = 'Could not identify medicine. Please try with a clearer photo.';
        Alert.alert('Scan Failed', e.message || msg);
        TTSService.speak(msg);
      }
      setFrameState('invalid');
      setScanStatus('Keep the medicine steady in the frame');
    } finally {
      setLoading(false);
      setProcessingStage('idle');
      isScanningRef.current = false;
    }
  }, [patient, language]);

  const handleCapture = useCallback(async () => {
  if (!camera.current || isScanningRef.current) return;
  isScanningRef.current = true;
  let filePath = '';
  try {
    // Take photo FIRST — before any state change that could unmount the camera
    const photo = await camera.current.takePhoto({ flash: 'off', enableShutterSound: false });
    filePath = photo.path;
  } catch {
    isScanningRef.current = false;
    Alert.alert('Camera Error', 'Could not take photo. Please try again.');
    return;
  }
  // Now safe to show loading overlay (camera ref no longer needed)
  setLoading(true);
  setProcessingStage('validating');
  setScanStatus('Validating…');
  await processImage('file://' + filePath, false);
}, [processImage]);

  const handleGallery = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (res.assets?.[0]?.uri) await processImage(res.assets[0].uri, false);
  };

  const handleAddToList = () => {
    if (!result || !patient?.id) return;
    addMedicine({
      patient_id: patient.id, name: result.medicine_name,
      generic_name: result.generic_name, dose_amount: 1, dose_unit: 'tablet',
      times_per_day: 1, dose_times: ['08:00'], days_type: 'daily',
      custom_days: [], start_date: new Date().toISOString().split('T')[0],
      end_date: null, stock_quantity: 0, notes: result.simple_description,
      scan_cache_json: JSON.stringify(result),
    });
    Alert.alert('✅ Added', `${result.medicine_name} has been added to your medicine list.`);
  };

  const handleScanAgain = () => {
    setResult(null);
    setShowDetailed(false);
    setFrameState('empty');
    setScanStatus('Place a medicine in the frame');
    setIsCameraActive(true);
  };

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permWrap}>
          <Text style={styles.permEmoji}>📷</Text>
          <Text style={styles.permTitle}>Camera Permission Needed</Text>
          <Text style={styles.permSub}>To scan medicines, please allow camera access.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const frameColor = frameState === 'candidate' ? FRAME_ACTIVE_COLOR : FRAME_ERROR_COLOR;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Camera — only when actively scanning */}
      {device && isCameraActive && (
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isCameraActive && isFocused}
          photo={true}
        />
      )}

      {/* Scanner UI */}
      {!result && !loading && (
        <>
          <View style={styles.overlayTop}>
            <SafeAreaView>
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.topTitle}>Scan Medicine</Text>
                <View style={{ width: 44 }} />
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.frameWrap}>
            <View style={[styles.frame, { borderColor: frameColor }]}>
              <View style={[styles.corner, { borderColor: frameColor }, styles.cornerTL]} />
              <View style={[styles.corner, { borderColor: frameColor }, styles.cornerTR]} />
              <View style={[styles.corner, { borderColor: frameColor }, styles.cornerBL]} />
              <View style={[styles.corner, { borderColor: frameColor }, styles.cornerBR]} />
            </View>
            <View style={[styles.scanTooltip, frameState === 'candidate' ? styles.scanTooltipGood : styles.scanTooltipBad]}>
              <Text style={styles.scanTooltipText}>{scanStatus}</Text>
            </View>
          </View>

          <View style={styles.overlayBottom}>
            <View style={styles.controls}>
              <TouchableOpacity onPress={handleGallery} style={styles.sideBtn}>
                <Text style={styles.sideBtnIcon}>🖼</Text>
                <Text style={styles.sideBtnLabel}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCapture} style={styles.captureBtn} activeOpacity={0.85}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
              <View style={styles.sideBtn} />
            </View>
          </View>
        </>
      )}

      {/* Full-screen animated scanning overlay */}
      {loading && processingStage !== 'idle' && (
        <ScanningOverlay stage={processingStage} lang={language} />
      )}

      {/* Simple result sheet */}
      {result && !showDetailed && (
        <View style={styles.resultOverlay}>
          <SafeAreaView style={{ flex: 1 }} />
          <View style={styles.simpleResult}>
            <View style={styles.simpleResultHandle} />
            <View style={styles.simpleResultHeader}>
              <View style={styles.medIconBig}><Text style={{ fontSize: 36 }}>💊</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{result.medicine_name}</Text>
                {result.generic_name ? <Text style={styles.genericName}>{result.generic_name}</Text> : null}
              </View>
              {result.how_to_take ? (
                <View style={styles.howBadge}>
                  <Text style={styles.howBadgeText}>{HOW_TO_LABEL(result.how_to_take)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.simpleDescript}>{result.simple_description}</Text>
            <View style={styles.simpleActions}>
              <TouchableOpacity style={styles.speakBtn} onPress={() => TTSService.speak(result.simple_description)}>
                <Text style={styles.speakBtnText}>🔊 Speak Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreBtn} onPress={() => setShowDetailed(true)}>
                <Text style={styles.moreBtnText}>Know More →</Text>
              </TouchableOpacity>
            </View>
            {!isAlreadyInSchedule ? (
              <TouchableOpacity style={styles.addListBtn} onPress={handleAddToList}>
                <Text style={styles.addListBtnText}>+ Add to My Medicines</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.addListBtn, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
                <Text style={[styles.addListBtnText, { color: colors.success }]}>✓ In Your Schedule</Text>
              </View>
            )}
            <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAgain}>
              <Text style={styles.scanAgainText}>Scan Another</Text>
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
              <Text style={styles.detailedTitle}>{result.medicine_name}</Text>
              <View style={{ width: 60 }} />
            </View>
            <View style={styles.tabBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {TABS.map((tab, i) => (
                  <TouchableOpacity key={tab} style={[styles.tab, activeTab === i && styles.tabActive]} onPress={() => setActiveTab(i)}>
                    <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <ScrollView contentContainerStyle={styles.tabContent}>
              <Text style={styles.tabBody}>
                {activeTab === 0 ? result.uses :
                 activeTab === 1 ? result.dosage_instructions :
                 activeTab === 2 ? result.side_effects :
                 activeTab === 3 ? result.warnings :
                 result.how_to_take ? HOW_TO_LABEL(result.how_to_take) + '\n\n' + (result.drug_interactions || '') : ''}
              </Text>
              {result.drug_interactions && activeTab === 4 && (
                <View style={styles.interactionBox}>
                  <Text style={styles.interactionTitle}>⚠️ Drug Interactions</Text>
                  <Text style={styles.interactionText}>{result.drug_interactions}</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.detailedFooter}>
              {!isAlreadyInSchedule ? (
                <TouchableOpacity style={styles.addListBtn} onPress={() => { handleAddToList(); setShowDetailed(false); }}>
                  <Text style={styles.addListBtnText}>+ Add to My Medicines</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.addListBtn, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
                  <Text style={[styles.addListBtnText, { color: colors.success }]}>✓ In Your Schedule</Text>
                </View>
              )}
            </View>
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
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 18 },
  topTitle: { ...typography.headingSmall, color: '#fff' },
  frameWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  frame: { width: FRAME, height: FRAME, position: 'relative', borderWidth: 1.5, borderRadius: borderRadius.sm },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanTooltip: { maxWidth: FRAME + 24, marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, borderWidth: 1 },
  scanTooltipGood: { backgroundColor: 'rgba(34,197,94,0.18)', borderColor: 'rgba(34,197,94,0.65)' },
  scanTooltipBad:  { backgroundColor: 'rgba(239,68,68,0.2)',  borderColor: 'rgba(239,68,68,0.7)' },
  scanTooltipText: { ...typography.caption, color: '#fff', textAlign: 'center' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', paddingBottom: 40, zIndex: 10 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: spacing.xl },
  sideBtn: { width: 60, alignItems: 'center' },
  sideBtnIcon: { fontSize: 28 },
  sideBtnLabel: { ...typography.tiny, color: '#fff', marginTop: 4 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  resultOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', zIndex: 15 },
  simpleResult: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, padding: spacing.xxl, gap: spacing.lg, elevation: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: -10 } },
  simpleResultHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  simpleResultHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  medIconBig: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  medName: { ...typography.headingLarge, color: colors.textPrimary },
  genericName: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  howBadge: { backgroundColor: colors.primaryLight, borderRadius: borderRadius.sm, padding: spacing.sm },
  howBadgeText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
  simpleDescript: { ...typography.bodyLarge, color: colors.textSecondary, lineHeight: 28 },
  simpleActions: { flexDirection: 'row', gap: spacing.md },
  speakBtn: { flex: 1, height: 46, borderRadius: borderRadius.sm, borderWidth: 1.5, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  speakBtnText: { ...typography.labelMedium, color: colors.primary },
  moreBtn: { flex: 1, height: 46, borderRadius: borderRadius.sm, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  moreBtnText: { ...typography.labelMedium, color: colors.primaryDark },
  addListBtn: { backgroundColor: colors.primary, height: sizes.buttonHeight, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  addListBtnText: { ...typography.labelLarge, color: '#fff' },
  scanAgainBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  scanAgainText: { ...typography.bodyMedium, color: colors.textSecondary },
  detailedSafe: { flex: 1, backgroundColor: colors.background },
  detailedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailedBack: { ...typography.bodyMedium, color: colors.primary },
  detailedTitle: { ...typography.headingSmall, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  tabBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText: { ...typography.labelMedium, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  tabContent: { padding: spacing.xl },
  tabBody: { ...typography.bodyLarge, color: colors.textSecondary, lineHeight: 30 },
  interactionBox: { marginTop: spacing.xl, backgroundColor: colors.warningLight, borderRadius: borderRadius.md, padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.warning },
  interactionTitle: { ...typography.labelMedium, color: colors.warning, marginBottom: spacing.sm },
  interactionText: { ...typography.bodyMedium, color: colors.textSecondary },
  detailedFooter: { padding: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});