import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import en from './en.json';

// Arabic-only for now. English resources kept for future use.
export type SupportedLocale = 'ar' | 'en';

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

export default i18n;

export function getCurrentLocale(): SupportedLocale {
  return 'ar';
}

// Reserved for future multi-language support
export async function changeLocale(_locale: SupportedLocale): Promise<void> {
  // No-op: app is Arabic-only
}
