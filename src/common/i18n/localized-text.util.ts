import type { LocalizedText } from './locale';

const clean = (value?: string | null): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

/**
 * Partial lokalizatsiyani to'liq {uz, ru, en} ga aylantiradi.
 * `uz` (asosiy til) bo'sh bo'lsa `fallback` ishlatiladi.
 * `ru`/`en` bo'sh bo'lsa `uz` qiymatidan to'ldiriladi.
 */
export const buildLocalizedText = (
  value: Partial<LocalizedText> | undefined | null,
  fallback = '',
): LocalizedText => {
  const uz = clean(value?.uz) || clean(fallback);
  const ru = clean(value?.ru) || uz;
  const en = clean(value?.en) || uz;

  return { uz, ru, en };
};

/**
 * Ixtiyoriy lokalizatsiya maydoni uchun.
 * `uz` bo'sh bo'lsa `null` qaytaradi (maydon yuborilmagan deb hisoblanadi),
 * aks holda yo'q tillarni `uz` qiymatidan to'ldiradi.
 */
export const normalizeOptionalLocalizedText = (
  value: Partial<LocalizedText> | undefined | null,
): LocalizedText | null => {
  const uz = clean(value?.uz);
  if (!uz) {
    return null;
  }

  return {
    uz,
    ru: clean(value?.ru) || uz,
    en: clean(value?.en) || uz,
  };
};
