import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import ar from './ar.json';
import en from './en.json';

export type SupportedLocale = 'ar' | 'en';

const LANG_KEY = 'app_language';

// Always start with Arabic — load saved preference async after init
i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: 'ar',
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

// Restore persisted language (runs after first render, updates text reactively)
// During expo export / SSR the code runs in Node.js where AsyncStorage and
// localStorage both require browser globals — skip entirely in that environment.
if (Platform.OS === 'web') {
  // Only read localStorage if we're in an actual browser (not Node.js SSR)
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  }
} else {
  AsyncStorage.getItem(LANG_KEY).then((saved) => {
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  });
}

export default i18n;

export function getCurrentLocale(): SupportedLocale {
  return i18n.language === 'en' ? 'en' : 'ar';
}

export async function changeLocale(locale: SupportedLocale): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANG_KEY, locale);
    }
  } else {
    await AsyncStorage.setItem(LANG_KEY, locale);
  }
  await i18n.changeLanguage(locale);
}
