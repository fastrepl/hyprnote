mod batch;
pub mod error;
mod keywords;
mod language;
mod live;

use super::LanguageQuality;

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

    pub fn supports_language(&self, language: &hypr_language::Language) -> bool {
        super::language_matches_supported_codes(language, self.supported_languages())
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
    pub fn is_supported_languages_live(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        Self::is_supported_languages_impl(languages, model)
    }

    pub fn is_supported_languages_batch(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        Self::is_supported_languages_impl(languages, model)
    }

    fn can_use_multi(languages: &[hypr_language::Language]) -> bool {
        language::can_use_multi(DeepgramModel::Nova3General.as_ref(), languages)
            || language::can_use_multi(DeepgramModel::Nova2General.as_ref(), languages)
    }

    fn is_supported_languages_impl(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        // Check if user-specified model supports all languages
        if let Some(model_str) = model {
            if let Ok(parsed_model) = model_str.parse::<DeepgramModel>() {
                if !languages
                    .iter()
                    .all(|lang| parsed_model.supports_language(lang))
                {
                    return false;
                }
            }
        }

        if languages.len() >= 2 {
            return Self::can_use_multi(languages);
        }

        DeepgramModel::best_for_languages(languages).is_some()
    }

    pub fn language_quality_live(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> LanguageQuality {
        if languages.len() >= 2 && !Self::can_use_multi(languages) {
            return LanguageQuality::NotSupported;
        }

        if let Some(model_str) = model {
            if let Ok(parsed_model) = model_str.parse::<DeepgramModel>() {
                if !languages
                    .iter()
                    .all(|lang| parsed_model.supports_language(lang))
                {
                    return LanguageQuality::NotSupported;
                }
            }
        }

        let qualities = languages.iter().map(Self::single_language_quality);
        LanguageQuality::min_quality(qualities)
    }

    fn single_language_quality(language: &hypr_language::Language) -> LanguageQuality {
        let code = language.iso639().code();
        if EXCELLENT_LANGS.contains(&code) {
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
            LanguageQuality::NotSupported
        }
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
    use hypr_language::ISO639;

    #[test]
    fn test_recommended_model_single_language() {
        let en: Vec<hypr_language::Language> = vec![ISO639::En.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&en), Some("nova-3"));

        let ja: Vec<hypr_language::Language> = vec![ISO639::Ja.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&ja), Some("nova-3"));

        let zh: Vec<hypr_language::Language> = vec![ISO639::Zh.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&zh), Some("nova-2"));
    }

    #[test]
    fn test_recommended_model_multi_language_nova3() {
        let en_es: Vec<hypr_language::Language> = vec![ISO639::En.into(), ISO639::Es.into()];
        assert_eq!(
            DeepgramAdapter::recommended_model_live(&en_es),
            Some("nova-3")
        );

        let en_fr: Vec<hypr_language::Language> = vec![ISO639::En.into(), ISO639::Fr.into()];
        assert_eq!(
            DeepgramAdapter::recommended_model_live(&en_fr),
            Some("nova-3")
        );

        let en_ja: Vec<hypr_language::Language> = vec![ISO639::En.into(), ISO639::Ja.into()];
        assert_eq!(
            DeepgramAdapter::recommended_model_live(&en_ja),
            Some("nova-3")
        );
    }

    #[test]
    fn test_recommended_model_multi_language_unsupported() {
        let en_ko: Vec<hypr_language::Language> = vec![ISO639::En.into(), ISO639::Ko.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&en_ko), None);

        let en_zh: Vec<hypr_language::Language> = vec![ISO639::En.into(), ISO639::Zh.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&en_zh), None);
    }

    #[test]
    fn test_en_ca_with_nova3_general_not_supported() {
        let en_ca: hypr_language::Language = "en-CA".parse().unwrap();
        let languages = vec![en_ca];

        assert!(!DeepgramAdapter::is_supported_languages_live(
            &languages,
            Some("nova-3-general")
        ));

        assert_eq!(
            DeepgramAdapter::language_quality_live(&languages, Some("nova-3-general")),
            LanguageQuality::NotSupported
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

        assert_ne!(
            DeepgramAdapter::language_quality_live(&languages, Some("nova-3-medical")),
            LanguageQuality::NotSupported
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
