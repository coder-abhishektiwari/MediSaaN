import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, SafeAreaView, Alert, Switch,
} from 'react-native';
import { usePatientStore } from '../store/patientStore';
import { addMedicine, updateMedicine } from '../db/queries/medicines';
import { useReminders } from '../hooks/useReminders';
import { colors, typography, spacing, borderRadius, sizes } from '../theme';
import dayjs from 'dayjs';

const UNITS = ['tablet', 'capsule', 'ml', 'mg', 'drops', 'spoon', 'patch'];
const DAYS_TYPES = ['daily', 'alternate', 'weekly', 'as needed'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function TimeButton({ time, onPress }: { time: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={tb.btn} onPress={onPress}>
      <Text style={tb.text}>{time}</Text>
      <Text style={tb.edit}>✏️</Text>
    </TouchableOpacity>
  );
}
const tb = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primaryLight, borderRadius: borderRadius.sm,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  text: { ...typography.headingSmall, color: colors.primary },
  edit: { fontSize: 14 },
});

export default function AddMedicineScreen({ navigation, route }: any) {
  const { patient } = usePatientStore();
  const { scheduleAll, cancelAll } = useReminders();
  const initialData = route.params?.initialData;
  const editMed = route.params?.editMedicine;

  const [name, setName]         = useState(editMed?.name || initialData?.name || '');
  const [genericName, setGen]   = useState(editMed?.generic_name || initialData?.generic_name || '');
  const [doseAmt, setDoseAmt]   = useState(editMed?.dose_amount?.toString() || '1');
  const [unit, setUnit]         = useState(editMed?.dose_unit || initialData?.dose_unit || 'tablet');
  const [timesPerDay, setTPD]   = useState(editMed?.times_per_day || 1);
  const [doseTimes, setDTimes]  = useState(editMed ? JSON.parse(editMed.dose_times) : ['08:00']);
  const [daysType, setDaysType] = useState(editMed?.days_type || 'daily');
  const [customDays, setCDays]  = useState<string[]>(editMed ? JSON.parse(editMed.custom_days) : []);
  const [startDate]             = useState(editMed?.start_date || dayjs().format('YYYY-MM-DD'));
  const [hasEndDate, setHasEnd] = useState(!!editMed?.end_date);
  const [stock, setStock]       = useState(editMed?.stock_quantity?.toString() || '30');
  const [notes, setNotes]       = useState(editMed?.notes || initialData?.notes || '');
  const [imagePath, setImage]   = useState(editMed?.image_path || initialData?.image_path || '');
  const [scanCache, setCache]   = useState(editMed?.scan_cache_json || initialData?.scan_cache_json || '');
  const [saving, setSaving]     = useState(false);

  const setTimesCount = (count: number) => {
    const defaults = ['08:00', '14:00', '20:00', '22:00'];
    setTPD(count);
    setDTimes(defaults.slice(0, count));
  };

  const updateTime = (index: number, val: string) => {
    const arr = [...doseTimes];
    arr[index] = val;
    setDTimes(arr);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter medicine name.'); return; }
    if (!patient?.id) { Alert.alert('Error', 'Patient profile not found.'); return; }
    setSaving(true);
    try {
      if (editMed) {
        // Update mode
        updateMedicine(editMed.id, {
          name: name.trim(), generic_name: genericName.trim(),
          image_path: imagePath,
          dose_amount: parseFloat(doseAmt) || 1, dose_unit: unit,
          times_per_day: timesPerDay, dose_times: doseTimes,
          days_type: daysType, custom_days: customDays,
          start_date: startDate, end_date: null,
          stock_quantity: parseInt(stock) || 0, notes: notes.trim(),
        });
        await cancelAll(editMed.id); // Refresh reminders
        const med = { id: editMed.id, name: name.trim(), dose_amount: doseAmt, dose_unit: unit, dose_times: JSON.stringify(doseTimes) };
        await scheduleAll([med]);
        Alert.alert('✅ Updated', `${name} updated successfully!`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        // Add mode
        const id = addMedicine({
          patient_id: patient.id, name: name.trim(), generic_name: genericName.trim(),
          image_path: imagePath,
          dose_amount: parseFloat(doseAmt) || 1, dose_unit: unit,
          times_per_day: timesPerDay, dose_times: doseTimes,
          days_type: daysType, custom_days: customDays,
          start_date: startDate, end_date: null,
          stock_quantity: parseInt(stock) || 0, notes: notes.trim(),
          scan_cache_json: scanCache,
        });
        const med = { id, name: name.trim(), dose_amount: doseAmt, dose_unit: unit, dose_times: JSON.stringify(doseTimes) };
        await scheduleAll([med]);
        Alert.alert('✅ Saved', `${name} added successfully!`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e: any) {
      Alert.alert('Error', `Could not save medicine: ${e.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Medicine</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medicine Details</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Medicine Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="e.g. Metformin 500mg" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Generic / Salt Name</Text>
            <TextInput style={styles.input} value={genericName} onChangeText={setGen}
              placeholder="e.g. Metformin HCl (optional)" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.fieldRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Dose Amount</Text>
              <TextInput style={styles.input} value={doseAmt} onChangeText={setDoseAmt}
                keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={[styles.field, { flex: 1.5 }]}>
              <Text style={styles.fieldLabel}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.unitRow}>
                  {UNITS.map(u => (
                    <TouchableOpacity key={u} style={[styles.unitChip, unit === u && styles.unitChipActive]} onPress={() => setUnit(u)}>
                      <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Times Per Day</Text>
            <View style={styles.stepperRow}>
              {[1,2,3,4].map(n => (
                <TouchableOpacity key={n} style={[styles.stepperBtn, timesPerDay === n && styles.stepperBtnActive]}
                  onPress={() => setTimesCount(n)}>
                  <Text style={[styles.stepperText, timesPerDay === n && styles.stepperTextActive]}>{n}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dose Times</Text>
            <View style={styles.timesRow}>
              {doseTimes.map((t: string, i: number) => (
                <TextInput key={i} style={styles.timeInput} value={t}
                  onChangeText={v => updateTime(i, v)} placeholder="HH:MM"
                  placeholderTextColor={colors.textMuted} keyboardType="numbers-and-punctuation" />
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Frequency</Text>
            <View style={styles.daysRow}>
              {DAYS_TYPES.map(d => (
                <TouchableOpacity key={d} style={[styles.dayChip, daysType === d && styles.dayChipActive]} onPress={() => setDaysType(d)}>
                  <Text style={[styles.dayText, daysType === d && styles.dayTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {daysType === 'weekly' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Select Days</Text>
              <View style={styles.weekRow}>
                {WEEKDAYS.map(d => (
                  <TouchableOpacity key={d} style={[styles.weekBtn, customDays.includes(d) && styles.weekBtnActive]}
                    onPress={() => setCDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])}>
                    <Text style={[styles.weekText, customDays.includes(d) && styles.weekTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock & Notes</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Stock Quantity (tablets/units)</Text>
            <TextInput style={styles.input} value={stock} onChangeText={setStock}
              keyboardType="numeric" placeholder="e.g. 30" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 12 }]}
              value={notes} onChangeText={setNotes} multiline
              placeholder="e.g. Take with food, shake before use" placeholderTextColor={colors.textMuted} />
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : '✓ Save Medicine'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  backText: { ...typography.bodyMedium, color: colors.primary },
  headerTitle: { ...typography.headingMedium, color: colors.textPrimary },
  scroll: { padding: spacing.xl, gap: spacing.xxl },
  section: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.xl, gap: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { ...typography.headingSmall, color: colors.primary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  field: { gap: spacing.sm },
  fieldRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  fieldLabel: { ...typography.labelMedium, color: colors.textSecondary },
  input: {
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.sm, height: sizes.inputHeight, paddingHorizontal: spacing.lg,
    ...typography.bodyMedium, color: colors.textPrimary,
  },
  unitRow: { flexDirection: 'row', gap: 8 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  unitChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  unitText: { ...typography.caption, color: colors.textSecondary },
  unitTextActive: { color: colors.primary, fontWeight: '700' },
  stepperRow: { flexDirection: 'row', gap: 8 },
  stepperBtn: { flex: 1, height: 44, borderRadius: borderRadius.sm, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  stepperBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  stepperText: { ...typography.labelMedium, color: colors.textSecondary },
  stepperTextActive: { color: colors.primary, fontWeight: '700' },
  timesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  timeInput: {
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.sm, height: 48, paddingHorizontal: 14, minWidth: 90,
    ...typography.headingSmall, color: colors.primary, textAlign: 'center',
  },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  dayChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dayText: { ...typography.caption, color: colors.textSecondary },
  dayTextActive: { color: colors.primary, fontWeight: '700' },
  weekRow: { flexDirection: 'row', gap: 8 },
  weekBtn: { flex: 1, height: 40, borderRadius: borderRadius.sm, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  weekBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  weekText: { ...typography.tiny, color: colors.textSecondary },
  weekTextActive: { color: colors.primary, fontWeight: '700' },
  footer: { padding: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: {
    backgroundColor: colors.primary, height: sizes.buttonHeight, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  saveBtnText: { ...typography.labelLarge, color: '#fff' },
});
