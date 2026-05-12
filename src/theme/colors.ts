export const colors = {
  primary:       '#1A7A6E',
  primaryLight:  '#E8F5F3',
  primaryDark:   '#0F4F47',
  accent:        '#F5A623',
  accentLight:   '#FEF3DC',
  success:       '#27AE60',
  successLight:  '#EAF6EE',
  warning:       '#E67E22',
  warningLight:  '#FEF0DC',
  danger:        '#E74C3C',
  dangerLight:   '#FEF0EE',
  info:          '#2980B9',
  infoLight:     '#EBF5FB',
  background:    '#FAFAF8',
  surface:       '#FFFFFF',
  surfaceAlt:    '#F5F5F2',
  textPrimary:   '#1A1A18',
  textSecondary: '#5A5A56',
  textMuted:     '#9A9A96',
  border:        '#E4E2DC',
  divider:       '#EDEBE5',
  overlay:       'rgba(0,0,0,0.55)',
  primaryGradientStart: '#1A7A6E',
  primaryGradientEnd:   '#0F5C52',
};

export const statusColors = {
  normal:   { bg: '#EAF6EE', text: '#1A7A3A', border: '#27AE60' },
  high:     { bg: '#FEF0EE', text: '#C0392B', border: '#E74C3C' },
  low:      { bg: '#EBF5FB', text: '#1A5276', border: '#2980B9' },
  critical: { bg: '#FCE4E4', text: '#922B21', border: '#CB4335' },
};

export const severityColors = {
  normal:       { bg: '#27AE60', icon: '✅', label: 'Normal' },
  mild_concern: { bg: '#E67E22', icon: '⚠️',  label: 'Mild Concern' },
  needs_attention: { bg: '#E74C3C', icon: '🔴', label: 'Needs Attention' },
  urgent:       { bg: '#C0392B', icon: '🚨', label: 'Urgent' },
};
