use owhisper_interface::ListenParams;

use crate::adapter::deepgram_compat::{
    LanguageQueryStrategy, Serializer, TranscriptionMode, UrlQuery,
};

pub const PARAKEET_V3_LANGS: &[&str] = &[
    "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hr", "hu", "it", "lt", "lv", "mt",
    "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "uk",
];

pub struct ArgmaxLanguageStrategy;

impl LanguageQueryStrategy for ArgmaxLanguageStrategy {
    fn append_language_query<'a>(
        &self,
        query_pairs: &mut Serializer<'a, UrlQuery>,
        params: &ListenParams,
        _mode: TranscriptionMode,
    ) {
        let lang = pick_single_language(params);
        query_pairs.append_pair("language", lang.iso639().code());
        if !params.languages.is_empty() {
            query_pairs.append_pair("detect_language", "false");
        }
    }
}

fn pick_single_language(params: &ListenParams) -> hypr_language::Language {
    let model = params.model.as_deref().unwrap_or("");

    if model.contains("parakeet") && model.contains("v2") {
        hypr_language::ISO639::En.into()
    } else if model.contains("parakeet") && model.contains("v3") {
        pick_preferred_language(&params.languages, |lang| {
            PARAKEET_V3_LANGS.contains(&lang.iso639().code())
        })
    } else {
        pick_preferred_language(&params.languages, |_| true)
    }
}

fn pick_preferred_language(
    languages: &[hypr_language::Language],
    is_supported: impl Fn(&hypr_language::Language) -> bool,
) -> hypr_language::Language {
    let prefers_non_english = languages.iter().any(|lang| lang.iso639().code() != "en");

    if prefers_non_english {
        if let Some(lang) = languages
            .iter()
            .find(|lang| lang.iso639().code() != "en" && is_supported(lang))
        {
            return lang.clone();
        }
    }

    languages
        .iter()
        .find(|lang| is_supported(lang))
        .cloned()
        .unwrap_or_else(|| hypr_language::ISO639::En.into())
}
