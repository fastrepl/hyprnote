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
    fn supported_languages(&self) -> &'static [&'static str] {
        match self {
            Self::Nova3General => NOVA3_GENERAL_LANGUAGES,
            Self::Nova3Medical => NOVA3_MEDICAL_LANGUAGES,
            Self::Nova2General => NOVA2_GENERAL_LANGUAGES,
            Self::Nova2Specialized => ENGLISH_ONLY,
        }
    }

    pub fn best_for_languages(languages: &[hypr_language::Language]) -> Option<Self> {
        let primary_lang = languages.first().map(|l| l.iso639().code()).unwrap_or("en");
        [Self::Nova3General, Self::Nova2General]
            .into_iter()
            .find(|&model| model.supported_languages().contains(&primary_lang))
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
        _model: Option<&str>,
    ) -> bool {
        if languages.len() >= 2 {
            return Self::can_use_multi(languages);
        }

        DeepgramModel::best_for_languages(languages).is_some()
    }

    pub fn language_quality_live(
        languages: &[hypr_language::Language],
        _model: Option<&str>,
    ) -> LanguageQuality {
        if languages.len() >= 2 && !Self::can_use_multi(languages) {
            return LanguageQuality::NotSupported;
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
    use hypr_language::{ISO639, Language};

    #[test]
    fn test_recommended_model_live() {
        let cases: &[(&[ISO639], Option<&str>)] = &[
            (&[ISO639::En], Some("nova-3")),
            (&[ISO639::Ja], Some("nova-3")),
            (&[ISO639::Zh], Some("nova-2")),
            (&[ISO639::Th], Some("nova-2")),
            (&[ISO639::Ar], None),
            (&[], Some("nova-3")),
            (&[ISO639::En, ISO639::Es], Some("nova-3")),
            (&[ISO639::En, ISO639::Fr], Some("nova-3")),
            (&[ISO639::En, ISO639::Ja], Some("nova-3")),
            (&[ISO639::Fr, ISO639::De], Some("nova-3")),
            (&[ISO639::En, ISO639::Ko], None),
            (&[ISO639::En, ISO639::Zh], None),
            (&[ISO639::Ko, ISO639::En], None),
        ];

        for (iso_codes, expected) in cases {
            let langs: Vec<Language> = iso_codes.iter().map(|&iso| iso.into()).collect();
            assert_eq!(
                DeepgramAdapter::recommended_model_live(&langs),
                *expected,
                "failed for {:?}",
                iso_codes
            );
        }
    }

    #[test]
    fn test_is_supported_languages_live() {
        let cases: &[(&[ISO639], bool)] = &[
            (&[ISO639::En], true),
            (&[ISO639::Zh], true),
            (&[ISO639::Th], true),
            (&[ISO639::Ar], false),
            (&[], true),
            (&[ISO639::En, ISO639::Es], true),
            (&[ISO639::En, ISO639::Ko], false),
            (&[ISO639::En, ISO639::Es, ISO639::Ko], false),
        ];

        for (iso_codes, expected) in cases {
            let langs: Vec<Language> = iso_codes.iter().map(|&iso| iso.into()).collect();
            assert_eq!(
                DeepgramAdapter::is_supported_languages_live(&langs, None),
                *expected,
                "failed for {:?}",
                iso_codes
            );
        }
    }

    #[test]
    fn test_can_use_multi() {
        let cases: &[(&str, &[ISO639], bool)] = &[
            ("nova-3", &[ISO639::En, ISO639::Es], true),
            ("nova-3", &[ISO639::En, ISO639::Fr], true),
            ("nova-3", &[ISO639::Fr, ISO639::De], true),
            ("nova-3", &[ISO639::En, ISO639::Ko], false),
            ("nova-3", &[ISO639::En, ISO639::Es, ISO639::Ko], false),
            ("nova-3", &[ISO639::En], false),
            ("nova-3", &[], false),
            ("nova-2", &[ISO639::En, ISO639::Es], true),
            ("nova-2", &[ISO639::En, ISO639::Fr], false),
            ("nova-2", &[ISO639::En, ISO639::Ja], false),
            ("nova-2", &[ISO639::Fr, ISO639::De], false),
            ("nova", &[ISO639::En, ISO639::Es], false),
            ("nova-1", &[ISO639::En, ISO639::Es], false),
            ("enhanced", &[ISO639::En, ISO639::Es], false),
            ("base", &[ISO639::En, ISO639::Es], false),
            ("whisper", &[ISO639::En, ISO639::Es], false),
            ("NOVA-3", &[ISO639::En, ISO639::Es], false),
            ("Nova-3", &[ISO639::En, ISO639::Es], false),
            ("", &[ISO639::En, ISO639::Es], false),
            ("   ", &[ISO639::En, ISO639::Es], false),
            ("nova-3-general", &[ISO639::En, ISO639::Es], true),
            ("nova-3-medical", &[ISO639::En, ISO639::Es], true),
            ("my-nova-3-custom", &[ISO639::En, ISO639::Es], true),
            ("nova-2-general", &[ISO639::En, ISO639::Es], true),
            ("nova-2-phonecall", &[ISO639::En, ISO639::Es], true),
        ];

        for (model, iso_codes, expected) in cases {
            let langs: Vec<Language> = iso_codes.iter().map(|&iso| iso.into()).collect();
            assert_eq!(
                language::can_use_multi(model, &langs),
                *expected,
                "failed for model={}, langs={:?}",
                model,
                iso_codes
            );
        }
    }

    #[test]
    fn test_nova3_multi_supports_all_10_languages() {
        let all_nova3_multi: Vec<Language> = vec![
            ISO639::En.into(),
            ISO639::Es.into(),
            ISO639::Fr.into(),
            ISO639::De.into(),
            ISO639::Hi.into(),
            ISO639::Ru.into(),
            ISO639::Pt.into(),
            ISO639::Ja.into(),
            ISO639::It.into(),
            ISO639::Nl.into(),
        ];
        assert!(language::can_use_multi("nova-3", &all_nova3_multi));
    }

    #[test]
    fn test_model_enum_parsing() {
        let valid_cases: &[(&str, DeepgramModel)] = &[
            ("nova-3", DeepgramModel::Nova3General),
            ("nova-3-general", DeepgramModel::Nova3General),
            ("nova-3-medical", DeepgramModel::Nova3Medical),
            ("nova-2", DeepgramModel::Nova2General),
            ("nova-2-general", DeepgramModel::Nova2General),
            ("nova-2-meeting", DeepgramModel::Nova2Specialized),
            ("nova-2-phonecall", DeepgramModel::Nova2Specialized),
            ("nova-2-medical", DeepgramModel::Nova2Specialized),
        ];

        for (input, expected) in valid_cases {
            assert_eq!(
                input.parse::<DeepgramModel>().unwrap(),
                *expected,
                "failed for {}",
                input
            );
        }

        let invalid_cases: &[&str] = &["nova-1", "nova", "whisper", "NOVA-3"];
        for input in invalid_cases {
            assert!(
                input.parse::<DeepgramModel>().is_err(),
                "should fail for {}",
                input
            );
        }
    }

    #[test]
    fn test_nova2_exclusive_languages() {
        let nova2_only: &[&str] = &[
            "zh", "zh-CN", "zh-TW", "zh-HK", "zh-Hans", "zh-Hant", "th", "th-TH",
        ];
        for code in nova2_only {
            assert!(
                NOVA2_GENERAL_LANGUAGES.contains(code),
                "{} should be in NOVA2_GENERAL_LANGUAGES",
                code
            );
            assert!(
                !NOVA3_GENERAL_LANGUAGES.contains(code),
                "{} should NOT be in NOVA3_GENERAL_LANGUAGES",
                code
            );
        }
    }

    #[test]
    fn test_nova3_medical_exclusive_regional_variants() {
        let medical_only: &[&str] = &["en-CA", "en-IE"];
        for code in medical_only {
            assert!(
                NOVA3_MEDICAL_LANGUAGES.contains(code),
                "{} should be in NOVA3_MEDICAL_LANGUAGES",
                code
            );
            assert!(
                !NOVA3_GENERAL_LANGUAGES.contains(code),
                "{} should NOT be in NOVA3_GENERAL_LANGUAGES",
                code
            );
            assert!(
                !NOVA2_GENERAL_LANGUAGES.contains(code),
                "{} should NOT be in NOVA2_GENERAL_LANGUAGES",
                code
            );
        }
    }

    #[test]
    fn test_regional_variants_in_nova3_general() {
        let expected: &[&str] = &[
            "en-US", "en-GB", "en-AU", "en-IN", "en-NZ", "pt-BR", "pt-PT", "fr-CA", "de-CH",
            "nl-BE",
        ];
        for code in expected {
            assert!(
                NOVA3_GENERAL_LANGUAGES.contains(code),
                "{} should be in NOVA3_GENERAL_LANGUAGES",
                code
            );
        }
    }

    #[test]
    fn test_best_for_languages() {
        let cases: &[(&[ISO639], Option<DeepgramModel>)] = &[
            (&[ISO639::En], Some(DeepgramModel::Nova3General)),
            (&[ISO639::Zh], Some(DeepgramModel::Nova2General)),
            (&[], Some(DeepgramModel::Nova3General)),
        ];

        for (iso_codes, expected) in cases {
            let langs: Vec<Language> = iso_codes.iter().map(|&iso| iso.into()).collect();
            assert_eq!(
                DeepgramModel::best_for_languages(&langs),
                *expected,
                "failed for {:?}",
                iso_codes
            );
        }
    }
}
