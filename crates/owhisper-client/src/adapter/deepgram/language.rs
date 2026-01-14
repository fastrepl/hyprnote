use owhisper_interface::ListenParams;

use crate::adapter::deepgram_compat::{
    LanguageQueryStrategy, Serializer, TranscriptionMode, UrlQuery,
};

const NOVA2_MULTI_LANGS: &[&str] = &["en", "es"];
const NOVA3_MULTI_LANGS: &[&str] = &["en", "es", "fr", "de", "hi", "ru", "pt", "ja", "it", "nl"];

pub fn can_use_multi(model: &str, languages: &[hypr_language::Language]) -> bool {
    if languages.len() < 2 {
        return false;
    }

    let multi_langs: &[&str] = if model.contains("nova-3") {
        NOVA3_MULTI_LANGS
    } else if model.contains("nova-2") {
        NOVA2_MULTI_LANGS
    } else {
        return false;
    };

    languages
        .iter()
        .all(|lang| multi_langs.contains(&lang.iso639().code()))
}

pub struct DeepgramLanguageStrategy;

impl LanguageQueryStrategy for DeepgramLanguageStrategy {
    fn append_language_query<'a>(
        &self,
        query_pairs: &mut Serializer<'a, UrlQuery>,
        params: &ListenParams,
        mode: TranscriptionMode,
    ) {
        let model = params.model.as_deref().unwrap_or("");

        match params.languages.len() {
            0 => {
                if mode == TranscriptionMode::Batch {
                    query_pairs.append_pair("detect_language", "true");
                } else {
                    query_pairs.append_pair("language", "en");
                }
            }
            1 => {
                if let Some(language) = params.languages.first() {
                    let code = language.bcp47_code();
                    query_pairs.append_pair("language", &code);
                }
            }
            _ => {
                if can_use_multi(model, &params.languages) {
                    query_pairs.append_pair("language", "multi");
                    for language in &params.languages {
                        let code = language.bcp47_code();
                        query_pairs.append_pair("languages", &code);
                    }
                } else if mode == TranscriptionMode::Batch {
                    query_pairs.append_pair("detect_language", "true");
                } else if let Some(language) = params.languages.first() {
                    let code = language.bcp47_code();
                    query_pairs.append_pair("language", &code);
                }
            }
        }
    }
}
