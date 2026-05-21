import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity,
  ScrollView, StatusBar, Platform, Linking, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '../theme';
import { ApiKeyService } from '../services/ApiKeyService';

const GEMINI_URL = 'https://aistudio.google.com/app/u/1/api-keys';
const GROQ_URL = 'https://console.groq.com/keys';

export default function ApiSetupScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');

  useEffect(() => {
    setGeminiKey(ApiKeyService.getGeminiKey());
    setGroqKey(ApiKeyService.getGroqKey());
  }, []);

  const openUrl = async (url: string) => {
  try {
    // Direct link open karo, complex checks ki jhanjhat khatam
    await Linking.openURL(url);
  } catch (e) {
    // Agar link invalid ho ya browser na khule toh error handle hoga
    Alert.alert(
      t('error'), 
      t('url_open_failed', { defaultValue: 'Unable to open the link. Please try again.' })
    );
  }
};

  const handleSaveKeys = () => {
    ApiKeyService.setGeminiKey(geminiKey);
    ApiKeyService.setGroqKey(groqKey);
    Alert.alert(t('saved'), t('api_keys_saved', { defaultValue: 'Your API keys are saved.' }));
  };

  const handleContinue = () => {
    handleSaveKeys();
    if (route.params?.fromProfile) {
      navigation.replace('Main');
    } else {
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    if (route.params?.fromProfile) {
      navigation.replace('Main');
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Icon name="key-outline" size={28} color={colors.primaryDark} />
          <Text style={styles.title}>{t('api_setup_title', { defaultValue: 'AI API Setup' })}</Text>
          <Text style={styles.subtitle}>{t('api_setup_intro', { defaultValue: 'Connect your own Gemini and Groq API keys for chat.' })}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('gemini_api_step', { defaultValue: '1. Create Gemini API Key' })}</Text>
          <Text style={styles.sectionDesc}>{t('gemini_api_step_desc', { defaultValue: 'Open Google AI Studio to create your Gemini key.' })}</Text>
          <TouchableOpacity style={styles.linkBtn} onPress={() => openUrl(GEMINI_URL)}>
            <Text style={styles.linkBtnText}>{t('open_gemini_console', { defaultValue: 'Open Gemini Dashboard' })}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t('paste_gemini_key', { defaultValue: 'Paste Gemini API key here' })}
            placeholderTextColor={colors.textMuted}
            value={geminiKey}
            onChangeText={setGeminiKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('groq_api_step', { defaultValue: '2. Create Groq API Key' })}</Text>
          <Text style={styles.sectionDesc}>{t('groq_api_step_desc', { defaultValue: 'Open Groq console to create your ChatGroq key.' })}</Text>
          <TouchableOpacity style={styles.linkBtn} onPress={() => openUrl(GROQ_URL)}>
            <Text style={styles.linkBtnText}>{t('open_groq_console', { defaultValue: 'Open Groq Dashboard' })}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t('paste_groq_key', { defaultValue: 'Paste Groq API key here' })}
            placeholderTextColor={colors.textMuted}
            value={groqKey}
            onChangeText={setGroqKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleContinue}>
          <Text style={styles.saveBtnText}>{t('set_api_keys', { defaultValue: 'Set API Keys' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>{t('skip_for_now', { defaultValue: 'Skip for now' })}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  title: { ...typography.headingLarge, color: colors.textPrimary },
  subtitle: { ...typography.bodyMedium, color: colors.textSecondary, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { ...typography.labelLarge, color: colors.ink, marginBottom: spacing.xs },
  sectionDesc: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
  linkBtn: { backgroundColor: colors.primaryDark, borderRadius: borderRadius.lg, paddingVertical: spacing.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  linkBtnText: { color: '#fff', fontWeight: '700' },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.lg, color: colors.textPrimary, marginTop: spacing.sm },
  saveBtn: { backgroundColor: colors.primaryDark, borderRadius: borderRadius.xl, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  saveBtnText: { color: '#fff', ...typography.bodyMedium, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.md },
  skipBtnText: { ...typography.bodyMedium, color: colors.primaryDark, fontWeight: '700' },
});
