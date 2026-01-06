export interface LanguageOption {
  code: string;
  name: string;
}

const languageDisplayNames = new Intl.DisplayNames(["en"], {
  type: "language",
});

export function getLanguageName(code: string): string {
  try {
    const name = languageDisplayNames.of(code);
    if (name && name !== code) {
      return name;
    }
  } catch {
    // Fall through to manual handling
  }

  const baseCode = code.split("-")[0];
  try {
    const baseName = languageDisplayNames.of(baseCode);
    if (baseName) {
      const region = code.split("-")[1];
      if (region) {
        return `${baseName} (${region.toUpperCase()})`;
      }
      return baseName;
    }
  } catch {
    // Fallback
  }

  return code;
}

export function getLanguageCode(code: string): string {
  return code.split("-")[0];
}

const SUPPORTED_LANGUAGE_CODES = [
  "en",
  "en-US",
  "en-GB",
  "en-AU",
  "es",
  "es-ES",
  "es-MX",
  "pt",
  "pt-BR",
  "pt-PT",
  "fr",
  "fr-FR",
  "fr-CA",
  "de",
  "de-DE",
  "de-AT",
  "de-CH",
  "it",
  "nl",
  "pl",
  "ru",
  "uk",
  "ja",
  "ko",
  "ko-KR",
  "zh",
  "zh-CN",
  "zh-TW",
  "ar",
  "hi",
  "th",
  "vi",
  "id",
  "ms",
  "tl",
  "tr",
  "sv",
  "da",
  "no",
  "fi",
  "cs",
  "sk",
  "hu",
  "ro",
  "bg",
  "hr",
  "sr",
  "sl",
  "el",
  "he",
  "ca",
  "gl",
  "bs",
  "mk",
  "et",
  "lv",
  "lt",
  "az",
  "ta",
];

export const SUPPORTED_LANGUAGES: LanguageOption[] =
  SUPPORTED_LANGUAGE_CODES.map((code) => ({
    code,
    name: getLanguageName(code),
  }));

export function getSupportedLanguageCodes(): string[] {
  return SUPPORTED_LANGUAGE_CODES;
}
