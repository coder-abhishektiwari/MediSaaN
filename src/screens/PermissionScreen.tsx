import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  ScrollView, StatusBar, AppState, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { PermissionService } from '../services/PermissionService';
import { useTranslation } from 'react-i18next';

export default function PermissionScreen({ navigation, route }: any) {
  const [perms, setPerms] = useState<any>(null);
  const { t } = useTranslation();

  const check = useCallback(async () => {
    const results = await PermissionService.checkAll();
    setPerms(results);
    
    // Auto-continue only if ALL critical ones are granted AND not coming from settings
    if (results.camera && results.notifications && results.alarm && results.overlay && !route.params?.fromSettings) {
      if (route.params?.onGrant) route.params.onGrant();
      else navigation.replace('Main');
    }
  }, [navigation, route.params]);

  useEffect(() => {
    check();
    // Re-check when user comes back from settings
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  const PermissionItem = ({ title, sub, icon, granted, onReq }: any) => (
    <View style={styles.item}>
      <View style={[styles.iconBox, { backgroundColor: granted ? colors.success + '15' : colors.primary + '10' }]}>
        <Icon name={icon} size={25} color={granted ? colors.success : colors.primaryDark} />
      </View>
      <View style={styles.content}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSub}>{sub}</Text>
      </View>
      {granted ? (
        <View style={styles.check}><Icon name="check" size={18} color="#fff" /></View>
      ) : (
        <TouchableOpacity style={styles.reqBtn} onPress={onReq}>
          <Text style={styles.reqBtnText}>{t('perm_allow')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!perms) return null;

  const isComplete = perms.camera && perms.notifications && perms.alarm && perms.overlay;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="shield-check-outline" size={34} color={colors.primaryDark} />
          </View>
          <Text style={styles.title}>{t('essential_perms')}</Text>
          <Text style={styles.sub}>{t('perm_intro')}</Text>
        </View>

        <View style={styles.list}>
          <PermissionItem 
            title={t('perm_reminders')} 
            sub={t('perm_reminders_sub')} 
            icon="bell-ring-outline" 
            granted={perms.notifications}
            onReq={PermissionService.requestNotifications}
          />
          <PermissionItem 
            title={t('perm_camera')} 
            sub={t('perm_camera_sub')} 
            icon="camera-outline" 
            granted={perms.camera}
            onReq={PermissionService.requestCamera}
          />
          <PermissionItem 
            title={t('perm_alarm_exact')} 
            sub={t('perm_alarm_exact_sub')} 
            icon="alarm-check" 
            granted={perms.alarm}
            onReq={PermissionService.requestAlarm}
          />
          <PermissionItem 
            title={t('perm_overlay')} 
            sub={t('perm_overlay_sub')} 
            icon="cellphone-cog" 
            granted={perms.overlay}
            onReq={PermissionService.requestOverlay}
          />
          {Platform.OS === 'android' && (
            <PermissionItem 
              title={t('perm_accessibility', { defaultValue: 'Accessibility Access' })} 
              sub={t('perm_accessibility_sub', { defaultValue: 'Needed for volume shortcuts to work when the app is in the background.' })} 
              icon="gesture-tap-hold" 
              granted={perms.accessibility}
              onReq={PermissionService.requestAccessibility}
            />
          )}
          <PermissionItem 
            title={t('perm_battery')} 
            sub={t('perm_battery_sub')} 
            icon="battery-heart-outline" 
            granted={perms.battery}
            onReq={PermissionService.requestBattery}
          />
          <PermissionItem 
            title={t('perm_voice')} 
            sub={t('perm_voice_sub')} 
            icon="microphone-outline" 
            granted={perms.voice}
            onReq={PermissionService.requestVoice}
          />
          <PermissionItem 
            title={t('perm_location')} 
            sub={t('perm_location_sub')} 
            icon="map-marker-outline" 
            granted={perms.location}
            onReq={PermissionService.requestLocation}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            {t('perm_footer_note')}
          </Text>
          <TouchableOpacity 
            style={[styles.continueBtn, !isComplete && !route.params?.fromSettings && styles.disabledBtn]} 
            onPress={() => {
              if (route.params?.fromSettings) {
                navigation.goBack();
              } else if (isComplete) {
                if (route.params?.onGrant) route.params.onGrant();
                else navigation.replace('Main');
              }
            }}
          >
            <Text style={styles.continueText}>{route.params?.fromSettings ? t('done') : t('continue')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { marginTop: 40, marginBottom: 40 },
  headerIcon: { width: 62, height: 62, borderRadius: borderRadius.xl, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  title: { ...typography.headingLarge, color: colors.ink, fontSize: 32 },
  sub: { ...typography.bodyMedium, color: colors.textSecondary, marginTop: 12, lineHeight: 22 },
  
  list: { gap: 20 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, elevation: 3, shadowColor: colors.cardShadow, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, marginLeft: 16, marginRight: 8 },
  itemTitle: { ...typography.labelLarge, color: colors.ink },
  itemSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  
  check: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  reqBtn: { backgroundColor: colors.primaryDark, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  reqBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  footer: { marginTop: 60, gap: 16 },
  footerNote: { textAlign: 'center', color: colors.textMuted, fontSize: 12 },
  continueBtn: { backgroundColor: colors.primaryDark, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: colors.cardShadow, shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  disabledBtn: { backgroundColor: '#cbd5e1' },
  continueText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
