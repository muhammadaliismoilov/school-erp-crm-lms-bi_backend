export const supportedLocales = ['uz', 'ru', 'en'] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = 'uz';

export type LocalizedText = Record<Locale, string>;

export const isLocale = (value: string): value is Locale =>
  supportedLocales.includes(value as Locale);

export const resolveLocale = (languageHeader?: string | string[]): Locale => {
  const rawHeader = Array.isArray(languageHeader)
    ? languageHeader.join(',')
    : languageHeader;

  if (!rawHeader) {
    return defaultLocale;
  }

  const candidates = rawHeader
    .split(',')
    .map((part) => part.trim().split(';')[0]?.trim().toLowerCase())
    .filter(Boolean)
    .map((part) => part.split('-')[0]);

  return candidates.find((candidate): candidate is Locale =>
    isLocale(candidate),
  ) ?? defaultLocale;
};

export const pickLocalizedText = (
  text: LocalizedText,
  locale: Locale,
): string => text[locale] ?? text[defaultLocale];
