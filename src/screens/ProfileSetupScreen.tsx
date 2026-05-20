import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, SafeAreaView, Alert,
} from 'react-native';
import { usePatientStore, Patient } from '../store/patientStore';
import { colors, typography, spacing, borderRadius, sizes } from '../theme';
import { db } from '../db/schema';
import { useTranslation } from 'react-i18next';

const CONDITIONS = ['Diabetes', 'BP', 'Heart Disease', 'Thyroid', 'Kidney', 'Asthma', 'Arthritis', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export default function ProfileSetupScreen({ navigation }: any) {
  const { patient, setPatient } = usePatientStore();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);

  const GENDERS = [
    { key: 'male', label: `👨 ${t('male')}` },
    { key: 'female', label: `👩 ${t('female')}` },
    { key: 'other', label: `🧑 ${t('other')}` },
  ];

  const [name, setName]         = useState(patient?.name || '');
  const [age, setAge]           = useState(patient?.age ? String(patient.age) : '');
  const [gender, setGender]     = useState<'male'|'female'|'other'>(patient?.gender || 'male');
  const [city, setCity]         = useState(patient?.city || '');
  const [bloodGroup, setBG]     = useState(patient?.blood_group || 'Unknown');
  const [conditions, setConds]  = useState<string[]>(patient?.conditions || []);
  const [allergies, setAllergy] = useState(patient?.allergies || '');
  const [caregiverName, setCN]  = useState(patient?.caregiver_name || '');
  const [caregiverPhone, setCP] = useState(patient?.caregiver_phone || '');
  const [doctorName, setDN]     = useState(patient?.doctor_name || '');
  const [doctorPhone, setDP]    = useState(patient?.doctor_phone || '');

  const toggleCond = (c: string) =>
    setConds(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const goNext = () => {
    if (step === 1 && !name.trim()) {
      Alert.alert(t('required'), t('required_name')); return;
    }
    if (step < 3) { setStep(s => s + 1); return; }
    save();
  };

  const save = () => {
    const updatedPatient: Patient = {
      id: patient?.id,
      name: name.trim(), age: parseInt(age) || 0, gender,
      city: city.trim(), blood_group: bloodGroup, conditions,
      allergies: allergies.trim(), caregiver_name: caregiverName.trim(),
      caregiver_phone: caregiverPhone.trim(), doctor_name: doctorName.trim(),
      doctor_phone: doctorPhone.trim(),
    };
    try {
      if (patient?.id) {
        db.execute(
          `UPDATE patients SET name=?, age=?, gender=?, city=?, blood_group=?, conditions=?, allergies=?, caregiver_name=?, caregiver_phone=?, doctor_name=?, doctor_phone=? WHERE id=?`,
          [updatedPatient.name, updatedPatient.age, updatedPatient.gender, updatedPatient.city, updatedPatient.blood_group,
           JSON.stringify(updatedPatient.conditions), updatedPatient.allergies,
           updatedPatient.caregiver_name, updatedPatient.caregiver_phone, updatedPatient.doctor_name, updatedPatient.doctor_phone, patient.id]
        );
      } else {
        const res = db.execute(
          `INSERT INTO patients (name,age,gender,city,blood_group,conditions,allergies,caregiver_name,caregiver_phone,doctor_name,doctor_phone)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [updatedPatient.name, updatedPatient.age, updatedPatient.gender, updatedPatient.city, updatedPatient.blood_group,
           JSON.stringify(updatedPatient.conditions), updatedPatient.allergies,
           updatedPatient.caregiver_name, updatedPatient.caregiver_phone, updatedPatient.doctor_name, updatedPatient.doctor_phone]
        );
        updatedPatient.id = res.insertId;
      }
    } catch (e) { console.warn('Patient save error:', e); }
    setPatient(updatedPatient);
    if (patient?.id) {
      navigation.goBack();
    } else {
      navigation.replace('Main');
    }
  };

  const stepLabels = [t('step_basic'), t('step_health'), t('step_emergency')];

  const renderStep = () => {
    if (step === 1) return (
      <View style={styles.stepContent}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('full_name_label')}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder={t('your_name')} placeholderTextColor={colors.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('your_age')}</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge}
            placeholder={t('age_placeholder')} placeholderTextColor={colors.textMuted} keyboardType="numeric" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('your_gender')}</Text>
          <View style={styles.genderRow}>
            {GENDERS.map(g => (
              <TouchableOpacity key={g.key} style={[styles.genderBtn, gender === g.key && styles.genderBtnActive]}
                onPress={() => setGender(g.key as any)}>
                <Text style={[styles.genderBtnText, gender === g.key && styles.genderBtnTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('your_city')}</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity}
            placeholder={t('city_placeholder')} placeholderTextColor={colors.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('blood_group')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity key={bg} style={[styles.chip, bloodGroup === bg && styles.chipActive]}
                  onPress={() => setBG(bg)}>
                  <Text style={[styles.chipText, bloodGroup === bg && styles.chipTextActive]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );

    if (step === 2) return (
      <View style={styles.stepContent}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('health_conditions')} ({t('health_conditions_hint')})</Text>
          <View style={styles.condGrid}>
            {CONDITIONS.map(c => (
              <TouchableOpacity key={c} style={[styles.condChip, conditions.includes(c) && styles.condChipActive]}
                onPress={() => toggleCond(c)}>
                <Text style={[styles.condChipText, conditions.includes(c) && styles.condChipTextActive]}>
                  {t('cond_' + c.toLowerCase().replace(/ /g, '_'), { defaultValue: c })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('allergies')}</Text>
          <TextInput style={[styles.input, styles.inputMulti]} value={allergies} onChangeText={setAllergy}
            placeholder={t('allergies_placeholder')}
            placeholderTextColor={colors.textMuted} multiline />
        </View>
      </View>
    );

    return (
      <View style={styles.stepContent}>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {t('caregiver_info_box')}
          </Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('caregiver_name')}</Text>
          <TextInput style={styles.input} value={caregiverName} onChangeText={setCN}
            placeholder={t('caregiver_name_placeholder')} placeholderTextColor={colors.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('caregiver_phone')}</Text>
          <TextInput style={styles.input} value={caregiverPhone} onChangeText={setCP}
            placeholder={t('caregiver_phone_placeholder')} placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('doctor_name')}</Text>
          <TextInput style={styles.input} value={doctorName} onChangeText={setDN}
            placeholder={t('doctor_name_placeholder')} placeholderTextColor={colors.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('doctor_phone')}</Text>
          <TextInput style={styles.input} value={doctorPhone} onChangeText={setDP}
            placeholder={t('doctor_phone_placeholder')} placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <View style={styles.stepDots}>
          {[1,2,3].map(i => (
            <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive, i === step && styles.stepDotCurrent]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>{stepLabels[step-1]}</Text>
        <Text style={styles.stepCount}>{t('step_of', { current: step, total: 3 })}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backBtnText}>← {t('back')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.nextBtn, step === 1 && { flex: 1 }]} onPress={goNext}
          activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>{step < 3 ? `${t('next')} →` : `✓ ${t('save_continue')}`}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepDots: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  stepDot: {
    height: 6, width: 24, borderRadius: 3,
    backgroundColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.primaryLight, width: 32 },
  stepDotCurrent: { backgroundColor: colors.primary, width: 48 },
  stepLabel: { ...typography.headingMedium, color: colors.textPrimary },
  stepCount: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  scroll: { padding: spacing.xl, paddingBottom: 20 },
  stepContent: { gap: spacing.lg },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.labelMedium, color: colors.textSecondary },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    height: sizes.inputHeight,
    paddingHorizontal: spacing.lg,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  inputMulti: { height: 80, paddingTop: spacing.md, textAlignVertical: 'top' },
  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderBtn: {
    flex: 1, height: 52, borderRadius: borderRadius.sm,
    borderWidth: 1.5, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surface,
  },
  genderBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  genderBtnText: { ...typography.labelMedium, color: colors.textSecondary },
  genderBtnTextActive: { color: colors.primary, fontWeight: '700' },
  chipScroll: { marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: borderRadius.full, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { ...typography.labelMedium, color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  condChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: borderRadius.full, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  condChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  condChipText: { ...typography.bodySmall, color: colors.textSecondary },
  condChipTextActive: { color: colors.primary, fontWeight: '600' },
  infoCard: {
    backgroundColor: colors.infoLight, borderRadius: borderRadius.sm,
    padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.info,
  },
  infoText: { ...typography.bodySmall, color: colors.info },
  footer: {
    flexDirection: 'row', gap: spacing.md,
    padding: spacing.xl, paddingBottom: spacing.xxxl,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  backBtn: {
    flex: 1, height: sizes.buttonHeight, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  backBtnText: { ...typography.labelLarge, color: colors.textSecondary },
  nextBtn: {
    flex: 2, height: sizes.buttonHeight, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: colors.primary, shadowOpacity: 0.35,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  nextBtnText: { ...typography.labelLarge, color: '#fff' },
});
