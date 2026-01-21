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
    fn test_recommended_model_single_language() {
        let en: Vec<Language> = vec![ISO639::En.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&en), Some("nova-3"));

        let ja: Vec<Language> = vec![ISO639::Ja.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&ja), Some("nova-3"));

        let zh: Vec<Language> = vec![ISO639::Zh.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&zh), Some("nova-2"));
    }

    #[test]
    fn test_recommended_model_multi_language_nova3() {
        let en_es: Vec<Language> = vec![ISO639::En.into(), ISO639::Es.into()];
        assert_eq!(
            DeepgramAdapter::recommended_model_live(&en_es),
            Some("nova-3")
        );

        let en_fr: Vec<Language> = vec![ISO639::En.into(), ISO639::Fr.into()];
        assert_eq!(
            DeepgramAdapter::recommended_model_live(&en_fr),
            Some("nova-3")
        );

        let en_ja: Vec<Language> = vec![ISO639::En.into(), ISO639::Ja.into()];
        assert_eq!(
            DeepgramAdapter::recommended_model_live(&en_ja),
            Some("nova-3")
        );
    }

    #[test]
    fn test_recommended_model_multi_language_unsupported() {
        let en_ko: Vec<Language> = vec![ISO639::En.into(), ISO639::Ko.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&en_ko), None);

        let en_zh: Vec<Language> = vec![ISO639::En.into(), ISO639::Zh.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&en_zh), None);
    }

    #[test]
    fn test_nova2_exclusive_languages_chinese_thai() {
        let zh: Vec<Language> = vec![ISO639::Zh.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&zh), Some("nova-2"));
        assert!(DeepgramAdapter::is_supported_languages_live(&zh, None));

        let th: Vec<Language> = vec![ISO639::Th.into()];
        assert_eq!(DeepgramAdapter::recommended_model_live(&th), Some("nova-2"));
        assert!(DeepgramAdapter::is_supported_languages_live(&th, None));

        assert!(!NOVA3_GENERAL_LANGUAGES.contains(&"zh"));
        assert!(!NOVA3_GENERAL_LANGUAGES.contains(&"th"));
        assert!(NOVA2_GENERAL_LANGUAGES.contains(&"zh"));
        assert!(NOVA2_GENERAL_LANGUAGES.contains(&"th"));
    }

    #[test]
    fn test_nova3_medical_exclusive_regional_variants() {
        assert!(NOVA3_MEDICAL_LANGUAGES.contains(&"en-CA"));
        assert!(NOVA3_MEDICAL_LANGUAGES.contains(&"en-IE"));
        assert!(!NOVA3_GENERAL_LANGUAGES.contains(&"en-CA"));
        assert!(!NOVA3_GENERAL_LANGUAGES.contains(&"en-IE"));
        assert!(!NOVA2_GENERAL_LANGUAGES.contains(&"en-CA"));
        assert!(!NOVA2_GENERAL_LANGUAGES.contains(&"en-IE"));
    }

    #[test]
    fn test_nova2_multi_only_supports_en_es() {
        let en_es: Vec<Language> = vec![ISO639::En.into(), ISO639::Es.into()];
        assert!(language::can_use_multi("nova-2", &en_es));

        let en_fr: Vec<Language> = vec![ISO639::En.into(), ISO639::Fr.into()];
        assert!(!language::can_use_multi("nova-2", &en_fr));

        let en_ja: Vec<Language> = vec![ISO639::En.into(), ISO639::Ja.into()];
        assert!(!language::can_use_multi("nova-2", &en_ja));
    }

    #[test]
    fn test_nova3_multi_supports_10_languages() {
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
    fn test_nova3_multi_rejects_unsupported_language() {
        let with_ko: Vec<Language> = vec![ISO639::En.into(), ISO639::Es.into(), ISO639::Ko.into()];
        assert!(!language::can_use_multi("nova-3", &with_ko));
    }

    #[test]
    fn test_multi_requires_at_least_two_languages() {
        let single: Vec<Language> = vec![ISO639::En.into()];
        assert!(!language::can_use_multi("nova-3", &single));
        assert!(!language::can_use_multi("nova-2", &single));

        let empty: Vec<Language> = vec![];
        assert!(!language::can_use_multi("nova-3", &empty));
        assert!(!language::can_use_multi("nova-2", &empty));
    }

    #[test]
    fn test_multi_without_english() {
        let fr_de: Vec<Language> = vec![ISO639::Fr.into(), ISO639::De.into()];
        assert!(language::can_use_multi("nova-3", &fr_de));
        assert!(!language::can_use_multi("nova-2", &fr_de));
    }

    #[test]
    fn test_legacy_model_multi_rejection() {
        let en_es: Vec<Language> = vec![ISO639::En.into(), ISO639::Es.into()];
        assert!(!language::can_use_multi("nova", &en_es));
        assert!(!language::can_use_multi("nova-1", &en_es));
        assert!(!language::can_use_multi("enhanced", &en_es));
        assert!(!language::can_use_multi("base", &en_es));
        assert!(!language::can_use_multi("whisper", &en_es));
    }

    #[test]
    fn test_model_string_case_sensitivity() {
        let en_es: Vec<Language> = vec![ISO639::En.into(), ISO639::Es.into()];
        assert!(language::can_use_multi("nova-3", &en_es));
        assert!(!language::can_use_multi("NOVA-3", &en_es));
        assert!(!language::can_use_multi("Nova-3", &en_es));
    }

    #[test]
    fn test_model_string_empty_and_whitespace() {
        let en_es: Vec<Language> = vec![ISO639::En.into(), ISO639::Es.into()];
        assert!(!language::can_use_multi("", &en_es));
        assert!(!language::can_use_multi("   ", &en_es));
    }

    #[test]
    fn test_model_string_substring_matching() {
        let en_es: Vec<Language> = vec![ISO639::En.into(), ISO639::Es.into()];
        assert!(language::can_use_multi("nova-3-general", &en_es));
        assert!(language::can_use_multi("nova-3-medical", &en_es));
        assert!(language::can_use_multi("my-nova-3-custom", &en_es));
        assert!(language::can_use_multi("nova-2-general", &en_es));
        assert!(language::can_use_multi("nova-2-phonecall", &en_es));
    }

    #[test]
    fn test_empty_languages_is_supported() {
        let empty: Vec<Language> = vec![];
        assert!(DeepgramAdapter::is_supported_languages_live(&empty, None));
    }

    #[test]
    fn test_empty_languages_recommended_model() {
        let empty: Vec<Language> = vec![];
        assert_eq!(
            DeepgramAdapter::recommended_model_live(&empty),
            Some("nova-3")
        );
    }

    #[test]
    fn test_unsupported_language() {
        let ar: Vec<Language> = vec![ISO639::Ar.into()];
        assert!(!DeepgramAdapter::is_supported_languages_live(&ar, None));
        assert_eq!(DeepgramAdapter::recommended_model_live(&ar), None);
    }

    #[test]
    fn test_language_quality_excellent() {
        for code in EXCELLENT_LANGS {
            let iso = match *code {
                "ru" => ISO639::Ru,
                "en" => ISO639::En,
                "es" => ISO639::Es,
                "pl" => ISO639::Pl,
                "fr" => ISO639::Fr,
                "it" => ISO639::It,
                _ => continue,
            };
            let langs: Vec<Language> = vec![iso.into()];
            assert_eq!(
                DeepgramAdapter::language_quality_live(&langs, None),
                LanguageQuality::Excellent,
                "Expected Excellent for {}",
                code
            );
        }
    }

    #[test]
    fn test_language_quality_high() {
        for code in HIGH_LANGS {
            let iso = match *code {
                "ja" => ISO639::Ja,
                "nl" => ISO639::Nl,
                "de" => ISO639::De,
                "ko" => ISO639::Ko,
                "pt" => ISO639::Pt,
                "sv" => ISO639::Sv,
                "uk" => ISO639::Uk,
                "vi" => ISO639::Vi,
                _ => continue,
            };
            let langs: Vec<Language> = vec![iso.into()];
            assert_eq!(
                DeepgramAdapter::language_quality_live(&langs, None),
                LanguageQuality::High,
                "Expected High for {}",
                code
            );
        }
    }

    #[test]
    fn test_language_quality_multi_takes_minimum() {
        let en_hi: Vec<Language> = vec![ISO639::En.into(), ISO639::Hi.into()];
        assert_eq!(
            DeepgramAdapter::language_quality_live(&en_hi, None),
            LanguageQuality::Moderate
        );
    }

    #[test]
    fn test_language_quality_unsupported_multi() {
        let en_ko: Vec<Language> = vec![ISO639::En.into(), ISO639::Ko.into()];
        assert_eq!(
            DeepgramAdapter::language_quality_live(&en_ko, None),
            LanguageQuality::NotSupported
        );
    }

    #[test]
    fn test_language_quality_empty() {
        let empty: Vec<Language> = vec![];
        assert_eq!(
            DeepgramAdapter::language_quality_live(&empty, None),
            LanguageQuality::NotSupported
        );
    }

    #[test]
    fn test_nova2_specialized_english_only() {
        assert_eq!(ENGLISH_ONLY, &["en", "en-US"]);
        assert_eq!(
            DeepgramModel::Nova2Specialized.supported_languages(),
            ENGLISH_ONLY
        );
    }

    #[test]
    fn test_model_enum_parsing() {
        assert_eq!(
            "nova-3".parse::<DeepgramModel>().unwrap(),
            DeepgramModel::Nova3General
        );
        assert_eq!(
            "nova-3-general".parse::<DeepgramModel>().unwrap(),
            DeepgramModel::Nova3General
        );
        assert_eq!(
            "nova-3-medical".parse::<DeepgramModel>().unwrap(),
            DeepgramModel::Nova3Medical
        );
        assert_eq!(
            "nova-2".parse::<DeepgramModel>().unwrap(),
            DeepgramModel::Nova2General
        );
        assert_eq!(
            "nova-2-general".parse::<DeepgramModel>().unwrap(),
            DeepgramModel::Nova2General
        );
        assert_eq!(
            "nova-2-meeting".parse::<DeepgramModel>().unwrap(),
            DeepgramModel::Nova2Specialized
        );
        assert_eq!(
            "nova-2-phonecall".parse::<DeepgramModel>().unwrap(),
            DeepgramModel::Nova2Specialized
        );
        assert_eq!(
            "nova-2-medical".parse::<DeepgramModel>().unwrap(),
            DeepgramModel::Nova2Specialized
        );
    }

    #[test]
    fn test_model_enum_parsing_invalid() {
        assert!("nova-1".parse::<DeepgramModel>().is_err());
        assert!("nova".parse::<DeepgramModel>().is_err());
        assert!("whisper".parse::<DeepgramModel>().is_err());
        assert!("NOVA-3".parse::<DeepgramModel>().is_err());
    }

    #[test]
    fn test_language_order_affects_fallback() {
        let ko_en: Vec<Language> = vec![ISO639::Ko.into(), ISO639::En.into()];
        let en_ko: Vec<Language> = vec![ISO639::En.into(), ISO639::Ko.into()];

        assert!(!DeepgramAdapter::can_use_multi(&ko_en));
        assert!(!DeepgramAdapter::can_use_multi(&en_ko));

        assert_eq!(DeepgramAdapter::recommended_model_live(&ko_en), None);
        assert_eq!(DeepgramAdapter::recommended_model_live(&en_ko), None);
    }

    #[test]
    fn test_three_languages_partial_multi_support() {
        let en_es_ko: Vec<Language> = vec![ISO639::En.into(), ISO639::Es.into(), ISO639::Ko.into()];
        assert!(!language::can_use_multi("nova-3", &en_es_ko));
        assert!(!DeepgramAdapter::is_supported_languages_live(
            &en_es_ko, None
        ));
    }

    #[test]
    fn test_chinese_variants_in_nova2() {
        assert!(NOVA2_GENERAL_LANGUAGES.contains(&"zh"));
        assert!(NOVA2_GENERAL_LANGUAGES.contains(&"zh-CN"));
        assert!(NOVA2_GENERAL_LANGUAGES.contains(&"zh-TW"));
        assert!(NOVA2_GENERAL_LANGUAGES.contains(&"zh-HK"));
        assert!(NOVA2_GENERAL_LANGUAGES.contains(&"zh-Hans"));
        assert!(NOVA2_GENERAL_LANGUAGES.contains(&"zh-Hant"));
    }

    #[test]
    fn test_regional_variants_in_nova3_general() {
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"en-US"));
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"en-GB"));
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"en-AU"));
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"en-IN"));
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"en-NZ"));
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"pt-BR"));
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"pt-PT"));
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"fr-CA"));
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"de-CH"));
        assert!(NOVA3_GENERAL_LANGUAGES.contains(&"nl-BE"));
    }

    #[test]
    fn test_best_for_languages_uses_iso639_code() {
        let en: Vec<Language> = vec![ISO639::En.into()];
        assert_eq!(
            DeepgramModel::best_for_languages(&en),
            Some(DeepgramModel::Nova3General)
        );

        let zh: Vec<Language> = vec![ISO639::Zh.into()];
        assert_eq!(
            DeepgramModel::best_for_languages(&zh),
            Some(DeepgramModel::Nova2General)
        );
    }

    #[test]
    fn test_best_for_languages_empty_defaults_to_english() {
        let empty: Vec<Language> = vec![];
        assert_eq!(
            DeepgramModel::best_for_languages(&empty),
            Some(DeepgramModel::Nova3General)
        );
    }
}
