mod keywords;
mod language;

pub use keywords::KeywordQueryStrategy;
pub use language::LanguageQueryStrategy;

pub use url::form_urlencoded::Serializer;
pub use url::UrlQuery;

use owhisper_interface::ListenParams;

pub fn listen_endpoint_url(api_base: &str) -> url::Url {
    let mut url: url::Url = api_base.parse().expect("invalid_api_base");

    let mut path = url.path().to_string();
    if !path.ends_with('/') {
        path.push('/');
    }
    path.push_str("listen");
    url.set_path(&path);

    url
}

pub fn set_scheme_from_host(url: &mut url::Url) {
    if let Some(host) = url.host_str() {
        if host.contains("127.0.0.1") || host.contains("localhost") || host.contains("0.0.0.0") {
            let _ = url.set_scheme("ws");
        } else {
            let _ = url.set_scheme("wss");
        }
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
    let mut url = listen_endpoint_url(api_base);

    {
        let mut query_pairs = url.query_pairs_mut();

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

    set_scheme_from_host(&mut url);

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
    let mut url = listen_endpoint_url(api_base);

    {
        let mut query_pairs = url.query_pairs_mut();

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
