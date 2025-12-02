mod batch;
mod live;

use owhisper_interface::ListenParams;
use url::form_urlencoded::Serializer;
use url::UrlQuery;

const NOVA2_MULTI_LANGS: &[&str] = &["en", "es"];
const NOVA3_MULTI_LANGS: &[&str] = &["en", "es", "fr", "de", "hi", "ru", "pt", "ja", "it", "nl"];

#[derive(Clone, Default)]
pub struct DeepgramAdapter;

impl DeepgramAdapter {
    pub(crate) fn listen_endpoint_url(api_base: &str) -> url::Url {
        let mut url: url::Url = api_base.parse().expect("invalid_api_base");

        let mut path = url.path().to_string();
        if !path.ends_with('/') {
            path.push('/');
        }
        path.push_str("listen");
        url.set_path(&path);

        url
    }
}

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

pub(crate) fn append_keyword_query<'a>(
    query_pairs: &mut Serializer<'a, UrlQuery>,
    params: &ListenParams,
) {
    if params.keywords.is_empty() {
        return;
    }

    let use_keyterms = params
        .model
        .as_ref()
        .map(|model| model.contains("nova-3") || model.contains("parakeet"))
        .unwrap_or(false);

    let param_name = if use_keyterms { "keyterm" } else { "keywords" };

    for keyword in &params.keywords {
        query_pairs.append_pair(param_name, keyword);
    }
}

pub(crate) fn append_language_query<'a>(
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
