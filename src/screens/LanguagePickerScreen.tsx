import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, SafeAreaView, Animated, ActivityIndicator, Alert,
} from 'react-native';
import { useLanguageStore, LANGUAGES } from '../store/languageStore';
import { usePatientStore } from '../store/patientStore';
import { colors, typography, spacing, borderRadius, sizes } from '../theme';
import i18n from '../utils/i18n';
import FastTranslator, { Languages } from 'fast-mlkit-translate-text';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Mapping local language codes to ML Kit Language names
export const MLKIT_LANG_MAP: Record<string, Languages | null> = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', mr: 'Marathi',
  ta: 'Tamil', te: 'Telugu', gu: 'Gujarati', kn: 'Kannada',
  ml: 'Malayalam', pa: null, or: null, ur: 'Urdu', // Punjabi and Odia not supported by ML Kit
};

export default function LanguagePickerScreen({ navigation }: any) {
  const { language, setLanguage } = useLanguageStore();
  const { patient } = usePatientStore();
  const { t } = useTranslation();
  
  const [selected, setSelected] = useState(language || 'en');
  const [downloadStatus, setDownloadStatus] = useState<Record<string, 'not_downloaded' | 'downloading' | 'downloaded'>>({});
  
  const scaleAnims = useRef(LANGUAGES.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Check initial download status for all supported languages
    const checkModels = async () => {
      const status: any = {};
      for (const lang of LANGUAGES) {
        const mlKitName = MLKIT_LANG_MAP[lang.code];
        if (mlKitName) {
          try {
            const isDownloaded = await FastTranslator.isLanguageDownloaded(mlKitName);
            status[lang.code] = isDownloaded ? 'downloaded' : 'not_downloaded';
          } catch (e) {
            status[lang.code] = 'not_downloaded';
          }
        } else {
          status[lang.code] = 'downloaded'; // Unsupported languages fallback to 'ready' state to allow selection
        }
      }
      setDownloadStatus(status);
    };
    checkModels();
  }, []);

  const handleDownload = async (code: string) => {
    const mlKitName = MLKIT_LANG_MAP[code];
    if (!mlKitName) return;
    
    setDownloadStatus(prev => ({ ...prev, [code]: 'downloading' }));
    try {
      await FastTranslator.downloadLanguageModel(mlKitName);
      setDownloadStatus(prev => ({ ...prev, [code]: 'downloaded' }));
    } catch (e) {
      Alert.alert(t('download_failed', { defaultValue: 'Download Failed' }), t('download_failed_desc', { defaultValue: 'Failed to download AI translation model. Please check internet connection.' }));
      setDownloadStatus(prev => ({ ...prev, [code]: 'not_downloaded' }));
    }
  };

  const handleSelect = (code: string, index: number) => {
    setSelected(code);
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[index], { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    i18n.changeLanguage(code); // Instantly change UI language for preview
  };

  const handleContinue = () => {
    // Ensure AI model is downloaded if supported
    const mlKitName = MLKIT_LANG_MAP[selected];
    if (mlKitName && downloadStatus[selected] === 'not_downloaded') {
      Alert.alert(t('hold_on', { defaultValue: 'Hold on' }), t('download_model_first', { defaultValue: 'Please download the AI translation model for this language first by tapping the cloud icon.' }));
      return;
    }
    
    setLanguage(selected);
    if (patient?.name) {
      navigation.goBack();
    } else {
      navigation.replace('ProfileSetup');
    }
  };

  const renderItem = ({ item, index }: { item: typeof LANGUAGES[0]; index: number }) => {
    const isSelected = item.code === selected;
    const status = downloadStatus[item.code] || 'downloaded';
    const isDownloading = status === 'downloading';
    const needsDownload = status === 'not_downloaded';

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnims[index] }], flex: 1, margin: 6 }}>
        <TouchableOpacity
          style={[styles.langCard, isSelected && styles.langCardSelected]}
          onPress={() => needsDownload ? handleDownload(item.code) : handleSelect(item.code, index)}
          activeOpacity={0.8}
          accessibilityLabel={`Select ${item.roman}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: isSelected }}
        >
          {isSelected && !needsDownload && !isDownloading && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
          
          <Text style={[styles.nativeText, isSelected && { color: colors.primary }]} numberOfLines={1}>
            {item.native}
          </Text>
          <Text style={[styles.romanText, isSelected && { color: colors.primaryDark }]}>
            {item.roman}
          </Text>
          
          {needsDownload && (
            <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownload(item.code)}>
              <Icon name="cloud-download-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          {isDownloading && (
            <View style={styles.downloadBtn}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>

        <View style={styles.header}>
          <View style={styles.logoSmall}><Text style={{ fontSize: 28 }}>🌿</Text></View>
          <Text style={styles.title}>{t('choose_language', { defaultValue: 'Choose your language' })}</Text>
          <Text style={styles.subtitle}>{t('choose_language_sub', { defaultValue: 'Select a language to continue' })}</Text>
        </View>

        <FlatList
          data={LANGUAGES}
          keyExtractor={item => item.code}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            activeOpacity={0.85}
            accessibilityLabel="Continue"
          >
            <Text style={styles.continueBtnText}>{t('continue', { defaultValue: 'Continue' })}  →</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>{t('data_local', { defaultValue: 'You can change this later' })}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  logoSmall: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  title: { ...typography.headingLarge, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.bodyMedium, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  grid: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  langCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.lg, minHeight: 80, justifyContent: 'center',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    position: 'relative', overflow: 'hidden',
  },
  langCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight, elevation: 4, shadowOpacity: 0.1 },
  checkBadge: {
    position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  nativeText: { ...typography.headingSmall, color: colors.textPrimary, marginBottom: 2 },
  romanText: { ...typography.caption, color: colors.textSecondary },
  downloadBtn: { position: 'absolute', bottom: 8, right: 8, padding: 4 },
  footer: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md },
  continueBtn: {
    backgroundColor: colors.primary, height: sizes.buttonHeight, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
    shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  continueBtnText: { ...typography.labelLarge, color: '#FFFFFF', letterSpacing: 0.5 },
  footerNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
