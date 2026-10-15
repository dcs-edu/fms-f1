export interface ColorTokens {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceVariant: string;
  surfaceElevated: string;
  border: string;
  borderFocus: string;
  
  // Brand - Pale Green / Sage
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  accent: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Status
  success: string;
  successContainer: string;
  warning: string;
  warningContainer: string;
  error: string;
  errorContainer: string;
  pending: string;
  pendingContainer: string;

  // Financial / Badges
  currencyBadge: string;
  currencyText: string;
  chipBackground: string;
  chipText: string;
}

export const lightColors: ColorTokens = {
  background: '#F6F9F7',
  backgroundSecondary: '#EEF4F0',
  surface: '#FFFFFF',
  surfaceVariant: '#EBF2EE',
  surfaceElevated: '#FFFFFF',
  border: '#D5E2D9',
  borderFocus: '#4E8766',

  // Brand - Pale Green / Sage
  primary: '#4E8766',
  primaryLight: '#73A588',
  primaryDark: '#335E45',
  primaryContainer: '#E2ECE5',
  onPrimaryContainer: '#1F3C2C',
  accent: '#5E9B77',

  // Text
  textPrimary: '#14251B',
  textSecondary: '#4B6355',
  textMuted: '#799385',
  textInverse: '#FFFFFF',

  // Status
  success: '#2E7D32',
  successContainer: '#E8F5E9',
  warning: '#D97706',
  warningContainer: '#FEF3C7',
  error: '#DC2626',
  errorContainer: '#FEE2E2',
  pending: '#B45309',
  pendingContainer: '#FFFBEB',

  // Financial
  currencyBadge: '#E2ECE5',
  currencyText: '#2C573E',
  chipBackground: '#E8F0EA',
  chipText: '#3B644D',
};

export const darkColors: ColorTokens = {
  background: '#0D1510',
  backgroundSecondary: '#131E17',
  surface: '#16231B',
  surfaceVariant: '#1D2F24',
  surfaceElevated: '#22382C',
  border: '#263D2F',
  borderFocus: '#73A588',

  // Brand - Pale Green / Sage
  primary: '#73A588',
  primaryLight: '#94C3A5',
  primaryDark: '#4E8766',
  primaryContainer: '#1E3628',
  onPrimaryContainer: '#CDE5D6',
  accent: '#82B797',

  // Text
  textPrimary: '#EAF3ED',
  textSecondary: '#9CB3A5',
  textMuted: '#6B8576',
  textInverse: '#0D1510',

  // Status
  success: '#4ADE80',
  successContainer: '#14381E',
  warning: '#FBBF24',
  warningContainer: '#382A0F',
  error: '#F87171',
  errorContainer: '#3C1616',
  pending: '#FCD34D',
  pendingContainer: '#33270A',

  // Financial
  currencyBadge: '#1B3124',
  currencyText: '#92C4A4',
  chipBackground: '#203428',
  chipText: '#AED7BF',
};
