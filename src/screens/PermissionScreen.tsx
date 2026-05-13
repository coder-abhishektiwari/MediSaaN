import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  ScrollView, StatusBar, Image, AppState 
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { PermissionService } from '../services/PermissionService';
import { useTranslation } from 'react-i18next';

export default function PermissionScreen({ navigation, route }: any) {
  const [perms, setPerms] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const check = useCallback(async () => {
    setLoading(true);
    const results = await PermissionService.checkAll();
    setPerms(results);
    setLoading(false);
    
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
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSub}>{sub}</Text>
      </View>
      {granted ? (
        <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>
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
          <Text style={styles.title}>{t('essential_perms')}</Text>
          <Text style={styles.sub}>{t('perm_intro')}</Text>
        </View>

        <View style={styles.list}>
          <PermissionItem 
            title={t('perm_reminders')} 
            sub={t('perm_reminders_sub')} 
            icon="🔔" 
            granted={perms.notifications}
            onReq={PermissionService.requestNotifications}
          />
          <PermissionItem 
            title={t('perm_camera')} 
            sub={t('perm_camera_sub')} 
            icon="📷" 
            granted={perms.camera}
            onReq={PermissionService.requestCamera}
          />
          <PermissionItem 
            title={t('perm_alarm_exact')} 
            sub={t('perm_alarm_exact_sub')} 
            icon="⏱" 
            granted={perms.alarm}
            onReq={PermissionService.requestAlarm}
          />
          <PermissionItem 
            title={t('perm_overlay')} 
            sub={t('perm_overlay_sub')} 
            icon="📱" 
            granted={perms.overlay}
            onReq={PermissionService.requestOverlay}
          />
          <PermissionItem 
            title={t('perm_battery')} 
            sub={t('perm_battery_sub')} 
            icon="🔋" 
            granted={perms.battery}
            onReq={PermissionService.requestBattery}
          />
          <PermissionItem 
            title={t('perm_voice')} 
            sub={t('perm_voice_sub')} 
            icon="🎤" 
            granted={perms.voice}
            onReq={PermissionService.requestVoice}
          />
          <PermissionItem 
            title={t('perm_location')} 
            sub={t('perm_location_sub')} 
            icon="📍" 
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
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { marginTop: 40, marginBottom: 40 },
  title: { ...typography.headingLarge, color: colors.textPrimary, fontSize: 32 },
  sub: { ...typography.bodyMedium, color: colors.textSecondary, marginTop: 12, lineHeight: 22 },
  
  list: { gap: 20 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 24 },
  content: { flex: 1, marginLeft: 16, marginRight: 8 },
  itemTitle: { ...typography.labelLarge, color: colors.textPrimary },
  itemSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  
  check: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  checkText: { color: '#fff', fontWeight: 'bold' },
  reqBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  reqBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  footer: { marginTop: 60, gap: 16 },
  footerNote: { textAlign: 'center', color: colors.textMuted, fontSize: 12 },
  continueBtn: { backgroundColor: colors.primary, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  disabledBtn: { backgroundColor: '#cbd5e1' },
  continueText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
