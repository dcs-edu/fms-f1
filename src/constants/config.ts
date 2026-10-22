import { Platform } from 'react-native';

/**
 * Default API host based on platform:
 * - Android emulator maps host machine localhost to 10.0.2.2
 * - iOS simulator connects to localhost
 * - Can be overridden dynamically or via environment
 */
export const DEFAULT_API_URL =
  Platform.OS === 'android' ? 'http://10.113.163.30:8080' : 'http://localhost:8080';

export const APP_CONFIG = {
  appName: 'Divine Charisma School Portal',
  apiBaseUrl: DEFAULT_API_URL,
  tokenStorageKey: 'school_jwt_token',
  themeStorageKey: 'school_theme_mode',
};
