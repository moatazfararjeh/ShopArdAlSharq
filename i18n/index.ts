import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
AsyncStorage.getItem(LANG_KEY).then((saved) => {
  if (saved && saved !== i18n.language) {
    i18n.changeLanguage(saved);
  }
});

export default i18n;

export function getCurrentLocale(): SupportedLocale {
  return i18n.language === 'en' ? 'en' : 'ar';
}

export async function changeLocale(locale: SupportedLocale): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, locale);
  await i18n.changeLanguage(locale);
}
