use owhisper_interface::ListenParams;

use crate::adapter::deepgram_compat::{LanguageQueryStrategy, Serializer, UrlQuery};

const NOVA2_MULTI_LANGS: &[&str] = &["en", "es"];
const NOVA3_MULTI_LANGS: &[&str] = &["en", "es", "fr", "de", "hi", "ru", "pt", "ja", "it", "nl"];

fn can_use_multi(model: &str, languages: &[hypr_language::Language]) -> bool {
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
    ) {
        let model = params.model.as_deref().unwrap_or("");

        match params.languages.len() {
            0 => {
                query_pairs.append_pair("detect_language", "true");
            }
            1 => {
                if let Some(language) = params.languages.first() {
                    let code = language.iso639().code();
                    query_pairs.append_pair("language", code);
                }
            }
            _ => {
                if can_use_multi(model, &params.languages) {
                    query_pairs.append_pair("language", "multi");
                    for language in &params.languages {
                        let code = language.iso639().code();
                        query_pairs.append_pair("languages", code);
                    }
                } else {
                    query_pairs.append_pair("detect_language", "true");
                    for language in &params.languages {
                        let code = language.iso639().code();
                        query_pairs.append_pair("languages", code);
                    }
                }
            }
        }
    }
}
