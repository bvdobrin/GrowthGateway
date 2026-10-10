import i18n, { type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'it', 'ar', 'ja'] as const;
export type UiLocale = (typeof SUPPORTED_LOCALES)[number];
export const NAMESPACES = ['common', 'nav', 'library', 'asset', 'validation', 'chat', 'taxonomy'] as const;

/** Endonyms shown in the language switcher. */
export const LOCALE_NAMES: Record<UiLocale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  ar: 'العربية',
  ja: '日本語',
};

const RTL: UiLocale[] = ['ar'];
const STORAGE_KEY = 'gg:locale';

const modules = import.meta.glob<Record<string, unknown>>('../locales/*/*.json', { eager: true, import: 'default' });

const resources: Resource = {};
for (const [path, content] of Object.entries(modules)) {
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lng, ns] = match;
  resources[lng] ??= {};
  resources[lng][ns] = content;
}

export const isUiLocale = (value: unknown): value is UiLocale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);

export const dirFor = (locale: string): 'rtl' | 'ltr' => (RTL.includes(locale as UiLocale) ? 'rtl' : 'ltr');

export function detectInitialLocale(): UiLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isUiLocale(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  const browser = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
  return isUiLocale(browser) ? browser : 'en';
}

export function persistLocale(locale: UiLocale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* storage unavailable */
  }
}

export function applyDocumentLocale(locale: UiLocale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = dirFor(locale);
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLocale(),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LOCALES],
  ns: [...NAMESPACES],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
  initImmediate: false,
});

export default i18n;
