use hypr_ws::client::Message;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::ListenParams;

use super::{append_keyword_query, append_language_query, DeepgramAdapter};
use crate::adapter::RealtimeSttAdapter;

impl RealtimeSttAdapter for DeepgramAdapter {
    fn supports_native_multichannel(&self) -> bool {
        true
    }

    fn build_ws_url(&self, api_base: &str, params: &ListenParams, channels: u8) -> url::Url {
        let mut url = Self::listen_endpoint_url(api_base);

        {
            let mut query_pairs = url.query_pairs_mut();

            append_language_query(&mut query_pairs, params);

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

            append_keyword_query(&mut query_pairs, params);
        }

        if let Some(host) = url.host_str() {
            if host.contains("127.0.0.1") || host.contains("localhost") || host.contains("0.0.0.0")
            {
                let _ = url.set_scheme("ws");
            } else {
                let _ = url.set_scheme("wss");
            }
        }

        url
    }

    fn build_auth_header(&self, api_key: Option<&str>) -> Option<(&'static str, String)> {
        api_key.map(|key| ("Authorization", format!("Token {}", key)))
    }

    fn keep_alive_message(&self) -> Option<Message> {
        Some(Message::Text(
            serde_json::to_string(&owhisper_interface::ControlMessage::KeepAlive)
                .unwrap()
                .into(),
        ))
    }

    fn finalize_message(&self) -> Message {
        Message::Text(
            serde_json::to_string(&owhisper_interface::ControlMessage::Finalize)
                .unwrap()
                .into(),
        )
    }

    fn parse_response(&self, raw: &str) -> Vec<StreamResponse> {
        serde_json::from_str(raw).into_iter().collect()
    }
}

#[cfg(test)]
mod tests {
    use crate::test_utils::{run_dual_test, run_single_test};
    use crate::ListenClient;

    #[tokio::test]
    #[ignore]
    async fn test_build_single() {
        let client = ListenClient::builder()
            .api_base("https://api.deepgram.com/v1")
            .api_key(std::env::var("DEEPGRAM_API_KEY").expect("DEEPGRAM_API_KEY not set"))
            .params(owhisper_interface::ListenParams {
                model: Some("nova-3".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_single();

        run_single_test(client, "deepgram").await;
    }

    #[tokio::test]
    #[ignore]
    async fn test_build_dual() {
        let client = ListenClient::builder()
            .api_base("https://api.deepgram.com/v1")
            .api_key(std::env::var("DEEPGRAM_API_KEY").expect("DEEPGRAM_API_KEY not set"))
            .params(owhisper_interface::ListenParams {
                model: Some("nova-3".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_dual();

        run_dual_test(client, "deepgram").await;
    }
}
