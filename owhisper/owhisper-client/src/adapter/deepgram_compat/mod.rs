mod keywords;
mod language;

pub use keywords::KeywordQueryStrategy;
pub use language::LanguageQueryStrategy;

pub use url::form_urlencoded::Serializer;
pub use url::UrlQuery;

use owhisper_interface::ListenParams;

pub fn listen_endpoint_url(api_base: &str) -> (url::Url, Vec<(String, String)>) {
    let mut url: url::Url = api_base.parse().expect("invalid_api_base");
    let existing_params = super::extract_query_params(&url);
    url.set_query(None);
    super::append_path_if_missing(&mut url, "/listen");
    (url, existing_params)
}

#[cfg(test)]
mod tests {
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

pub fn build_listen_ws_url<L, K>(
    api_base: &str,
    params: &ListenParams,
    channels: u8,
    lang_strategy: &L,
    keyword_strategy: &K,
) -> url::Url
where
    L: LanguageQueryStrategy,
    K: KeywordQueryStrategy,
{
    let (mut url, existing_params) = listen_endpoint_url(api_base);

    {
        let mut query_pairs = url.query_pairs_mut();

        for (key, value) in &existing_params {
            query_pairs.append_pair(key, value);
        }

        lang_strategy.append_language_query(&mut query_pairs, params);

        let model = params.model.as_deref().unwrap_or("hypr-whisper");
        let channel_string = channels.to_string();
        let sample_rate = params.sample_rate.to_string();

        query_pairs.append_pair("model", model);
        query_pairs.append_pair("channels", &channel_string);
        query_pairs.append_pair("filler_words", "false");
        query_pairs.append_pair("interim_results", "true");
        query_pairs.append_pair("mip_opt_out", "true");
        query_pairs.append_pair("sample_rate", &sample_rate);
        query_pairs.append_pair("encoding", "linear16");
        query_pairs.append_pair("diarize", "true");
        query_pairs.append_pair("multichannel", "true");
        query_pairs.append_pair("punctuate", "true");
        query_pairs.append_pair("smart_format", "true");
        query_pairs.append_pair("vad_events", "false");
        query_pairs.append_pair("numerals", "true");

        let redemption_time = params.redemption_time_ms.unwrap_or(400).to_string();
        query_pairs.append_pair("redemption_time_ms", &redemption_time);

        keyword_strategy.append_keyword_query(&mut query_pairs, params);
    }

    super::set_scheme_from_host(&mut url);

    url
}

pub fn build_batch_url<L, K>(
    api_base: &str,
    params: &ListenParams,
    lang_strategy: &L,
    keyword_strategy: &K,
) -> url::Url
where
    L: LanguageQueryStrategy,
    K: KeywordQueryStrategy,
{
    let (mut url, existing_params) = listen_endpoint_url(api_base);

    {
        let mut query_pairs = url.query_pairs_mut();

        for (key, value) in &existing_params {
            query_pairs.append_pair(key, value);
        }

        lang_strategy.append_language_query(&mut query_pairs, params);

        let model = params.model.as_deref().unwrap_or("hypr-whisper");
        let sample_rate = params.sample_rate.to_string();

        query_pairs.append_pair("model", model);
        query_pairs.append_pair("encoding", "linear16");
        query_pairs.append_pair("sample_rate", &sample_rate);
        query_pairs.append_pair("diarize", "true");
        query_pairs.append_pair("multichannel", "false");
        query_pairs.append_pair("punctuate", "true");
        query_pairs.append_pair("smart_format", "true");
        query_pairs.append_pair("utterances", "true");
        query_pairs.append_pair("numerals", "true");
        query_pairs.append_pair("filler_words", "false");
        query_pairs.append_pair("dictation", "false");
        query_pairs.append_pair("paragraphs", "false");
        query_pairs.append_pair("profanity_filter", "false");
        query_pairs.append_pair("measurements", "false");
        query_pairs.append_pair("topics", "false");
        query_pairs.append_pair("sentiment", "false");
        query_pairs.append_pair("intents", "false");
        query_pairs.append_pair("detect_entities", "false");
        query_pairs.append_pair("mip_opt_out", "true");

        keyword_strategy.append_keyword_query(&mut query_pairs, params);
    }

    url
}
