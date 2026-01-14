mod batch;
mod keywords;
mod language;
mod live;

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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, strum::EnumString)]
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
    pub fn from_model_str(model: Option<&str>) -> Self {
        model.and_then(|m| m.parse().ok()).unwrap_or_default()
    }

    fn supported_languages(&self) -> &'static [&'static str] {
        match self {
            Self::Nova3General => NOVA3_GENERAL_LANGUAGES,
            Self::Nova3Medical => NOVA3_MEDICAL_LANGUAGES,
            Self::Nova2General => NOVA2_GENERAL_LANGUAGES,
            Self::Nova2Specialized => ENGLISH_ONLY,
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

    fn is_supported_languages_impl(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        let primary_lang = languages.first().map(|l| l.iso639().code()).unwrap_or("en");
        let deepgram_model = DeepgramModel::from_model_str(model);
        deepgram_model.supported_languages().contains(&primary_lang)
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
