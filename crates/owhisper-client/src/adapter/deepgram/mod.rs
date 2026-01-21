mod batch;
pub mod error;
mod keywords;
mod language;
mod live;

use super::{LanguageQuality, LanguageSupport};

// https://developers.deepgram.com/docs/models-languages-overview
const NOVA3_GENERAL_LANGUAGES: &[&str] = &[
    "bg", "ca", "cs", "da", "da-DK", "de", "de-CH", "el", "en", "en-AU", "en-GB", "en-IN", "en-NZ",
    "en-US", "es", "es-419", "et", "fi", "fr", "fr-CA", "hi", "hu", "id", "it", "ja", "ko",
    "ko-KR", "lt", "lv", "ms", "nl", "nl-BE", "no", "pl", "pt", "pt-BR", "pt-PT", "ro", "ru", "sk",
    "sv", "sv-SE", "tr", "uk", "vi",
];

const NOVA2_GENERAL_LANGUAGES: &[&str] = &[
    "bg", "ca", "cs", "da", "da-DK", "de", "de-CH", "el", "en", "en-AU", "en-GB", "en-IN", "en-NZ",
    "en-US", "es", "es-419", "et", "fi", "fr", "fr-CA", "hi", "hu", "id", "it", "ja", "ko",
    "ko-KR", "lt", "lv", "ms", "nl", "nl-BE", "no", "pl", "pt", "pt-BR", "pt-PT", "ro", "ru", "sk",
    "sv", "sv-SE", "th", "th-TH", "tr", "uk", "vi", "zh", "zh-CN", "zh-HK", "zh-Hans", "zh-Hant",
    "zh-TW",
];

const NOVA3_MEDICAL_LANGUAGES: &[&str] = &[
    "en", "en-AU", "en-CA", "en-GB", "en-IE", "en-IN", "en-NZ", "en-US",
];

const ENGLISH_ONLY: &[&str] = &["en", "en-US"];

const EXCELLENT_LANGS: &[&str] = &["ru", "en", "es", "pl", "fr", "it"];

const HIGH_LANGS: &[&str] = &["ja", "nl", "de", "ko", "pt", "sv", "uk", "vi"];

const GOOD_LANGS: &[&str] = &["tr", "fi", "da", "id", "el", "no", "ca"];

const MODERATE_LANGS: &[&str] = &["cs", "sk", "hu", "bg", "hi", "ms", "ro", "et"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, strum::EnumString, strum::AsRefStr)]
pub enum DeepgramModel {
    #[default]
    #[strum(serialize = "nova-3", serialize = "nova-3-general")]
    Nova3General,
    #[strum(serialize = "nova-3-medical")]
    Nova3Medical,
    #[strum(serialize = "nova-2", serialize = "nova-2-general")]
    Nova2General,
    #[strum(
        serialize = "nova-2-meeting",
        serialize = "nova-2-phonecall",
        serialize = "nova-2-finance",
        serialize = "nova-2-conversationalai",
        serialize = "nova-2-voicemail",
        serialize = "nova-2-video",
        serialize = "nova-2-medical",
        serialize = "nova-2-drivethru",
        serialize = "nova-2-automotive",
        serialize = "nova-2-atc"
    )]
    Nova2Specialized,
}

impl DeepgramModel {
    pub fn supported_languages(&self) -> &'static [&'static str] {
        match self {
            Self::Nova3General => NOVA3_GENERAL_LANGUAGES,
            Self::Nova3Medical => NOVA3_MEDICAL_LANGUAGES,
            Self::Nova2General => NOVA2_GENERAL_LANGUAGES,
            Self::Nova2Specialized => ENGLISH_ONLY,
        }
    }

    pub fn supports_language(&self, lang: &hypr_language::Language) -> bool {
        super::language_matches_supported_codes(lang, self.supported_languages())
    }

    pub fn supports_multi(&self, languages: &[hypr_language::Language]) -> bool {
        language::can_use_multi(self.as_ref(), languages)
    }

    pub fn best_for_languages(languages: &[hypr_language::Language]) -> Option<Self> {
        let primary_lang = languages.first()?;

        [Self::Nova3General, Self::Nova3Medical, Self::Nova2General]
            .into_iter()
            .find(|model| model.supports_language(primary_lang))
    }

    pub fn best_for_multi_languages(languages: &[hypr_language::Language]) -> Option<Self> {
        if language::can_use_multi(Self::Nova3General.as_ref(), languages) {
            Some(Self::Nova3General)
        } else if language::can_use_multi(Self::Nova2General.as_ref(), languages) {
            Some(Self::Nova2General)
        } else {
            None
        }
    }
}

#[derive(Clone, Default)]
pub struct DeepgramAdapter;

impl DeepgramAdapter {
    pub fn language_support_live(
        languages: &[hypr_language::Language],
        model: Option<DeepgramModel>,
    ) -> LanguageSupport {
        Self::language_support_impl(languages, model)
    }

    pub fn language_support_batch(
        languages: &[hypr_language::Language],
        model: Option<DeepgramModel>,
    ) -> LanguageSupport {
        Self::language_support_impl(languages, model)
    }

    fn language_support_impl(
        languages: &[hypr_language::Language],
        model: Option<DeepgramModel>,
    ) -> LanguageSupport {
        if languages.is_empty() {
            return LanguageSupport::Supported {
                quality: LanguageQuality::NoData,
            };
        }

        if languages.len() >= 2 {
            let effective_model = model.unwrap_or_default();
            if !effective_model.supports_multi(languages) && !Self::can_use_multi(languages) {
                return LanguageSupport::NotSupported;
            }
        }

        if let Some(m) = model {
            if !languages.iter().all(|lang| m.supports_language(lang)) {
                return LanguageSupport::NotSupported;
            }
        } else if DeepgramModel::best_for_languages(languages).is_none() {
            return LanguageSupport::NotSupported;
        }

        LanguageSupport::min(languages.iter().map(Self::single_language_support))
    }

    pub fn is_supported_languages_live(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        let model = model.and_then(|m| m.parse::<DeepgramModel>().ok());
        Self::language_support_live(languages, model).is_supported()
    }

    pub fn is_supported_languages_batch(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        let model = model.and_then(|m| m.parse::<DeepgramModel>().ok());
        Self::language_support_batch(languages, model).is_supported()
    }

    fn can_use_multi(languages: &[hypr_language::Language]) -> bool {
        language::can_use_multi(DeepgramModel::Nova3General.as_ref(), languages)
            || language::can_use_multi(DeepgramModel::Nova2General.as_ref(), languages)
    }

    fn single_language_support(language: &hypr_language::Language) -> LanguageSupport {
        let code = language.iso639().code();
        let quality = if EXCELLENT_LANGS.contains(&code) {
            LanguageQuality::Excellent
        } else if HIGH_LANGS.contains(&code) {
            LanguageQuality::High
        } else if GOOD_LANGS.contains(&code) {
            LanguageQuality::Good
        } else if MODERATE_LANGS.contains(&code) {
            LanguageQuality::Moderate
        } else if DeepgramModel::best_for_languages(std::slice::from_ref(language)).is_some() {
            LanguageQuality::NoData
        } else {
            return LanguageSupport::NotSupported;
        };
        LanguageSupport::Supported { quality }
    }

    pub fn recommended_model_live(languages: &[hypr_language::Language]) -> Option<&'static str> {
        let model = if languages.len() >= 2 {
            DeepgramModel::best_for_multi_languages(languages)
        } else {
            DeepgramModel::best_for_languages(languages)
        };

        match model {
            Some(DeepgramModel::Nova3General) => Some("nova-3"),
            Some(DeepgramModel::Nova3Medical) => Some("nova-3-medical"),
            Some(DeepgramModel::Nova2General) => Some("nova-2"),
            Some(DeepgramModel::Nova2Specialized) => Some("nova-2"),
            None => None,
        }
    }
}

pub(super) fn documented_language_codes() -> Vec<&'static str> {
    let mut codes = Vec::new();
    codes.extend_from_slice(NOVA3_GENERAL_LANGUAGES);
    codes.extend_from_slice(NOVA2_GENERAL_LANGUAGES);
    codes.extend_from_slice(NOVA3_MEDICAL_LANGUAGES);
    codes.extend_from_slice(ENGLISH_ONLY);
    codes
}

#[cfg(test)]
mod tests {
    use super::*;
    use hypr_language::{ISO639, Language};

    #[test]
    fn test_recommended_model_live() {
        let cases: Vec<(Vec<Language>, Option<&str>)> = vec![
            (vec![Language::new(ISO639::En)], Some("nova-3")),
            (vec![Language::new(ISO639::Ja)], Some("nova-3")),
            (vec![Language::new(ISO639::Zh)], Some("nova-2")),
            (
                vec![Language::with_region(ISO639::En, "CA")],
                Some("nova-3-medical"),
            ),
            (
                vec![Language::new(ISO639::En), Language::new(ISO639::Es)],
                Some("nova-3"),
            ),
            (
                vec![Language::new(ISO639::En), Language::new(ISO639::Fr)],
                Some("nova-3"),
            ),
            (
                vec![Language::new(ISO639::En), Language::new(ISO639::Ja)],
                Some("nova-3"),
            ),
            (
                vec![Language::new(ISO639::En), Language::new(ISO639::Ko)],
                None,
            ),
            (
                vec![Language::new(ISO639::En), Language::new(ISO639::Zh)],
                None,
            ),
        ];

        for (languages, expected) in cases {
            assert_eq!(
                DeepgramAdapter::recommended_model_live(&languages),
                expected,
                "failed for {:?}",
                languages
            );
        }
    }

    #[test]
    fn test_language_support_with_model() {
        let cases: Vec<(Vec<Language>, DeepgramModel, bool)> = vec![
            (
                vec![Language::new(ISO639::En)],
                DeepgramModel::Nova3General,
                true,
            ),
            (
                vec![Language::new(ISO639::En)],
                DeepgramModel::Nova3Medical,
                true,
            ),
            (
                vec![Language::new(ISO639::En)],
                DeepgramModel::Nova2General,
                true,
            ),
            (
                vec![Language::with_region(ISO639::En, "CA")],
                DeepgramModel::Nova3Medical,
                true,
            ),
        ];

        for (languages, model, expected) in cases {
            assert_eq!(
                DeepgramAdapter::language_support_live(&languages, Some(model)).is_supported(),
                expected,
                "failed for {:?} with {:?}",
                languages,
                model
            );
        }
    }

    #[test]
    fn test_language_support_quality() {
        let en: Vec<hypr_language::Language> = vec![ISO639::En.into()];
        let support = DeepgramAdapter::language_support_live(&en, None);
        assert_eq!(support.quality(), Some(LanguageQuality::Excellent));

        let ja: Vec<hypr_language::Language> = vec![ISO639::Ja.into()];
        let support = DeepgramAdapter::language_support_live(&ja, None);
        assert_eq!(support.quality(), Some(LanguageQuality::High));
    }

    #[test]
    fn test_model_supports_language() {
        let en: hypr_language::Language = ISO639::En.into();
        let zh: hypr_language::Language = ISO639::Zh.into();

        assert!(DeepgramModel::Nova3General.supports_language(&en));
        assert!(!DeepgramModel::Nova3General.supports_language(&zh));
        assert!(DeepgramModel::Nova2General.supports_language(&zh));
    }

    #[test]
    fn test_en_ca_with_nova3_general_not_supported() {
        let en_ca: hypr_language::Language = "en-CA".parse().unwrap();
        let languages = vec![en_ca];

        assert!(!DeepgramAdapter::is_supported_languages_live(
            &languages,
            Some("nova-3-general")
        ));

        assert!(
            !DeepgramAdapter::language_support_live(&languages, Some(DeepgramModel::Nova3General))
                .is_supported()
        );
    }

    #[test]
    fn test_en_ca_with_nova3_medical_supported() {
        let en_ca: hypr_language::Language = "en-CA".parse().unwrap();
        let languages = vec![en_ca];

        assert!(DeepgramAdapter::is_supported_languages_live(
            &languages,
            Some("nova-3-medical")
        ));

        assert!(
            DeepgramAdapter::language_support_live(&languages, Some(DeepgramModel::Nova3Medical))
                .is_supported()
        );
    }

    #[test]
    fn test_en_ca_auto_selects_nova3_medical() {
        let en_ca: hypr_language::Language = "en-CA".parse().unwrap();
        let languages = vec![en_ca];

        assert_eq!(
            DeepgramAdapter::recommended_model_live(&languages),
            Some("nova-3-medical")
        );
    }

    #[test]
    fn test_en_us_with_nova3_general_supported() {
        let en_us: hypr_language::Language = "en-US".parse().unwrap();
        let languages = vec![en_us];

        assert!(DeepgramAdapter::is_supported_languages_live(
            &languages,
            Some("nova-3-general")
        ));
    }
}
