import VolumeManager from 'react-native-volume-manager';
import { navigationRef } from '../navigation/navigationRef';

let lastVolumeTime = 0;
let lastVolumeDir = '';
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

export function initVolumeShortcuts(enabled: boolean) {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (!enabled) return;

  const sub = VolumeManager.addVolumeListener((result) => {
    const now = Date.now();
    // Determine direction from result type if available
    const dir = (result as any).type === 'down' ? 'down' : 'up';

    // Clear any existing hold timer when key released
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }

    // Vol Up + Down within 700ms → Medicine Scan
    if (lastVolumeDir && lastVolumeDir !== dir && now - lastVolumeTime < 700) {
      navigationRef.current?.navigate('QuickScan' as never);
      lastVolumeDir = '';
      return;
    }

    // Vol Up held for 3s → Report Scan
    if (dir === 'up') {
      holdTimer = setTimeout(() => {
        navigationRef.current?.navigate('ReportScan' as never);
        holdTimer = null;
        lastVolumeDir = '';
      }, 3000);
    }

    lastVolumeTime = now;
    lastVolumeDir = dir;
  });

  unsubscribe = () => sub.remove();
}

export function destroyVolumeShortcuts() {
  if (holdTimer) clearTimeout(holdTimer);
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}
