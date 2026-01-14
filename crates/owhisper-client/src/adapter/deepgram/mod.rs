mod batch;
mod keywords;
mod language;
mod live;

// https://developers.deepgram.com/docs/models-languages-overview
const NOVA3_GENERAL_LANGUAGES: &[&str] = &[
    "bg", "ca", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hi", "hu", "id", "it", "ja",
    "ko", "lt", "lv", "ms", "nl", "no", "pl", "pt", "ro", "ru", "sk", "sv", "tr", "uk", "vi",
];

const NOVA2_GENERAL_LANGUAGES: &[&str] = &[
    "bg", "ca", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hi", "hu", "id", "it", "ja",
    "ko", "lt", "lv", "ms", "nl", "no", "pl", "pt", "ro", "ru", "sk", "sv", "th", "tr", "uk", "vi",
    "zh",
];

const ENGLISH_ONLY: &[&str] = &["en"];

const NOVA2_SPECIALIZED_SUFFIXES: &[&str] = &[
    "-meeting",
    "-phonecall",
    "-finance",
    "-conversationalai",
    "-voicemail",
    "-video",
    "-medical",
    "-drivethru",
    "-automotive",
    "-atc",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum DeepgramModel {
    #[default]
    Nova3General,
    Nova3Medical,
    Nova2General,
    Nova2Specialized,
}

impl DeepgramModel {
    pub fn from_model_str(model: Option<&str>) -> Self {
        let Some(m) = model else {
            return Self::Nova3General;
        };

        if m.starts_with("nova-3") {
            if m == "nova-3" || m == "nova-3-general" {
                Self::Nova3General
            } else {
                Self::Nova3Medical
            }
        } else if m.starts_with("nova-2") {
            if m == "nova-2" || m == "nova-2-general" {
                Self::Nova2General
            } else if NOVA2_SPECIALIZED_SUFFIXES.iter().any(|s| m.ends_with(s)) {
                Self::Nova2Specialized
            } else {
                Self::Nova2General
            }
        } else {
            Self::Nova3General
        }
    }

    fn supported_languages(&self) -> &'static [&'static str] {
        match self {
            Self::Nova3General => NOVA3_GENERAL_LANGUAGES,
            Self::Nova3Medical => ENGLISH_ONLY,
            Self::Nova2General => NOVA2_GENERAL_LANGUAGES,
            Self::Nova2Specialized => ENGLISH_ONLY,
        }
    }
}

#[derive(Clone, Default)]
pub struct DeepgramAdapter;

impl DeepgramAdapter {
    pub fn is_supported_languages(
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        let primary_lang = languages.first().map(|l| l.iso639().code()).unwrap_or("en");
        let deepgram_model = DeepgramModel::from_model_str(model);
        deepgram_model.supported_languages().contains(&primary_lang)
    }
}
