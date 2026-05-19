export const colors = {
  primary:       '#22C7C9', // Logo cyan
  primaryLight:  '#E7FAFA',
  primaryDark:   '#123B8F', // Deep blue from logo

  accent:        '#4DD9D5',
  accentLight:   '#EAFDFC',

  success:       '#1FBF9A',
  successLight:  '#E7FAF5',

  warning:       '#3FA9F5',
  warningLight:  '#EAF5FE',

  danger:        '#1D4ED8',
  dangerLight:   '#E8F0FE',

  info:          '#2563EB',
  infoLight:     '#EDF4FF',

  background:    '#F7FAFC',
  surface:       '#FFFFFF',
  surfaceAlt:    '#F0F5FA',

  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',

  border:        '#DCE6F2',
  divider:       '#EAF1F8',

  overlay:       'rgba(0,0,0,0.55)',

  primaryGradientStart: '#123B8F',
  primaryGradientEnd:   '#22C7C9',
};

export const statusColors = {
  normal: {
    bg: '#E8FCF7',
    text: '#0F8F73',
    border: '#1FBF9A',
  },

  high: {
    bg: '#EEF4FF',
    text: '#1D4ED8',
    border: '#2563EB',
  },

  low: {
    bg: '#EAFDFC',
    text: '#0F766E',
    border: '#22C7C9',
  },

  critical: {
    bg: '#DBEAFE',
    text: '#123B8F',
    border: '#1E40AF',
  },
};

export const severityColors = {
  normal: {
    bg: '#1FBF9A',
    icon: '✅',
    label: 'Normal',
  },

  mild_concern: {
    bg: '#22C7C9',
    icon: '⚠️',
    label: 'Mild Concern',
  },

  needs_attention: {
    bg: '#2563EB',
    icon: '🔵',
    label: 'Needs Attention',
  },

  urgent: {
    bg: '#123B8F',
    icon: '🚨',
    label: 'Urgent',
  },
};