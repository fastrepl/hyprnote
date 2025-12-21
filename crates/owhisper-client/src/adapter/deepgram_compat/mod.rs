use owhisper_interface::ListenParams;
use owhisper_providers::{Params, ParamsTransform, Provider};

use super::url_builder::ParamsExt;

pub fn listen_endpoint_url(api_base: &str) -> (url::Url, Vec<(String, String)>) {
    let mut url: url::Url = api_base.parse().expect("invalid_api_base");
    let existing_params = super::extract_query_params(&url);
    url.set_query(None);
    super::append_path_if_missing(&mut url, "/listen");
    (url, existing_params)
}

#[cfg(test)]
mod url_tests {
    use super::*;

    #[test]
    fn test_listen_endpoint_url_appends_listen() {
        let (url, params) = listen_endpoint_url("https://api.deepgram.com/v1");
        assert_eq!(url.as_str(), "https://api.deepgram.com/v1/listen");
        assert!(params.is_empty());
    }

    #[test]
    fn test_listen_endpoint_url_preserves_query_params() {
        let (url, params) = listen_endpoint_url("https://api.hyprnote.com/v1?provider=deepgram");
        assert_eq!(url.as_str(), "https://api.hyprnote.com/v1/listen");
        assert_eq!(params, vec![("provider".into(), "deepgram".into())]);
    }

    #[test]
    fn test_listen_endpoint_url_no_double_listen() {
        let (url, params) =
            listen_endpoint_url("https://api.hyprnote.com/listen?provider=deepgram");
        assert_eq!(url.as_str(), "https://api.hyprnote.com/listen");
        assert_eq!(params, vec![("provider".into(), "deepgram".into())]);
    }

    #[test]
    fn test_listen_endpoint_url_no_double_listen_with_trailing_slash() {
        let (url, params) = listen_endpoint_url("https://api.hyprnote.com/listen/");
        assert_eq!(url.as_str(), "https://api.hyprnote.com/listen/");
        assert!(params.is_empty());
    }
}

pub fn build_listen_ws_url(
    api_base: &str,
    params: &ListenParams,
    channels: u8,
    provider: Provider,
) -> url::Url {
    let (mut url, existing_params) = listen_endpoint_url(api_base);

    let mut query_params = Params::new();
    for (key, value) in &existing_params {
        query_params.add(key, value);
    }

    let default_model = provider.default_live_model();
    query_params
        .add_common_listen_params(params, channels, default_model)
        .add_bool("interim_results", true)
        .add_bool("multichannel", channels > 1)
        .add_bool("vad_events", false)
        .add(
            "redemption_time_ms",
            params.redemption_time_ms.unwrap_or(400),
        );

    let language_codes: Vec<String> = params
        .languages
        .iter()
        .map(|l| l.iso639().code().to_string())
        .collect();
    query_params
        .add_keywords(&params.keywords)
        .add_languages(&language_codes);

    query_params.apply_to(&mut url);
    query_params.apply_keywords_and_languages(&mut url, provider);

    super::set_scheme_from_host(&mut url);

    url
}

pub fn build_batch_url(api_base: &str, params: &ListenParams, provider: Provider) -> url::Url {
    let (mut url, existing_params) = listen_endpoint_url(api_base);

    let mut query_params = Params::new();
    for (key, value) in &existing_params {
        query_params.add(key, value);
    }

    let default_model = provider.default_batch_model();
    let model = params
        .model
        .as_deref()
        .or(default_model)
        .unwrap_or("nova-3-general");
    query_params
        .add("model", model)
        .add("encoding", "linear16")
        .add_bool("diarize", true)
        .add_bool("multichannel", false)
        .add_bool("punctuate", true)
        .add_bool("smart_format", true)
        .add_bool("utterances", true)
        .add_bool("numerals", true)
        .add_bool("filler_words", false)
        .add_bool("dictation", false)
        .add_bool("paragraphs", false)
        .add_bool("profanity_filter", false)
        .add_bool("measurements", false)
        .add_bool("topics", false)
        .add_bool("sentiment", false)
        .add_bool("intents", false)
        .add_bool("detect_entities", false)
        .add_bool("mip_opt_out", true);

    let language_codes: Vec<String> = params
        .languages
        .iter()
        .map(|l| l.iso639().code().to_string())
        .collect();
    query_params
        .add_keywords(&params.keywords)
        .add_languages(&language_codes);

    query_params.apply_to(&mut url);
    query_params.apply_keywords_and_languages(&mut url, provider);

    url
}
