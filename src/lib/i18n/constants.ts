import locales from '@/locales';

export type Language = {
  key: keyof typeof locales;
  dir?: 'ltr' | 'rtl';
  fontScale?: number;
};

export const DEFAULT_NAMESPACE = 'common';

export const DEFAULT_LANGUAGE_KEY: Language['key'] = 'en';

export const AVAILABLE_LANGUAGES: Language[] = [
  { key: 'en' },
  { key: 'fr' },
  // TODO: Add 'ar' (RTL) and 'sw' when locale files are created
];
export type LanguageKey = Language['key'];
