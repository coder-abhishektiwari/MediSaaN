export const colors = {
  primary:       '#155E75',
  primaryLight:  '#E6F7F8',
  primaryDark:   '#0F2E4A',

  accent:        '#34D399',
  accentLight:   '#E9FBF4',

  success:       '#0F9F7A',
  successLight:  '#E5F8F1',

  warning:       '#F59E0B',
  warningLight:  '#FFF7E6',

  danger:        '#DC2626',
  dangerLight:   '#FEF2F2',

  info:          '#4F46E5',
  infoLight:     '#EEF2FF',

  background:    '#F4F8FB',
  surface:       '#FFFFFF',
  surfaceAlt:    '#EAF2F6',
  surfaceGlass:  'rgba(255,255,255,0.88)',
  ink:           '#071826',

  textPrimary:   '#102033',
  textSecondary: '#526579',
  textMuted:     '#8EA0B4',

  border:        '#D7E5EE',
  divider:       '#E8F0F5',

  overlay:       'rgba(7,24,38,0.62)',

  primaryGradientStart: '#0F2E4A',
  primaryGradientEnd:   '#0EA5A5',
  clinicalGradientStart: '#F8FCFD',
  clinicalGradientEnd:   '#E7F4F8',
  cardShadow: '#0F2E4A',
};

export const statusColors = {
  normal: {
    bg: '#E5F8F1',
    text: '#08745B',
    border: '#0F9F7A',
  },

  high: {
    bg: '#FFF7E6',
    text: '#A15C07',
    border: '#F59E0B',
  },

  low: {
    bg: '#E6F7F8',
    text: '#155E75',
    border: '#0EA5A5',
  },

  critical: {
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#DC2626',
  },
};

export const severityColors = {
  normal: {
    bg: '#0F9F7A',
    icon: '✅',
    label: 'Normal',
  },

  mild_concern: {
    bg: '#0EA5A5',
    icon: '⚠️',
    label: 'Mild Concern',
  },

  needs_attention: {
    bg: '#F59E0B',
    icon: '🔵',
    label: 'Needs Attention',
  },

  urgent: {
    bg: '#DC2626',
    icon: '🚨',
    label: 'Urgent',
  },
};
