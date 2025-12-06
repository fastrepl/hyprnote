use hypr_ws::client::Message;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::ListenParams;

use crate::adapter::deepgram_compat::build_listen_ws_url;
use crate::adapter::RealtimeSttAdapter;

use super::{keywords::ArgmaxKeywordStrategy, language::ArgmaxLanguageStrategy, ArgmaxAdapter};

impl RealtimeSttAdapter for ArgmaxAdapter {
    fn provider_name(&self) -> &'static str {
        "argmax"
    }

    fn supports_native_multichannel(&self) -> bool {
        false
    }

    fn build_ws_url(&self, api_base: &str, params: &ListenParams, channels: u8) -> url::Url {
        build_listen_ws_url(
            api_base,
            params,
            channels,
            &ArgmaxLanguageStrategy,
            &ArgmaxKeywordStrategy,
        )
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
    use super::ArgmaxAdapter;
    use crate::test_utils::{run_dual_test, run_single_test};
    use crate::ListenClient;

    #[tokio::test]
    #[ignore]
    async fn test_build_single() {
        let client = ListenClient::builder()
            .adapter::<ArgmaxAdapter>()
            .api_base("ws://localhost:50060/v1")
            .api_key("")
            .params(owhisper_interface::ListenParams {
                model: Some("large-v3-v20240930_626MB".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_single()
            .await;

        run_single_test(client, "argmax").await;
    }

    #[tokio::test]
    #[ignore]
    async fn test_build_dual() {
        let client = ListenClient::builder()
            .adapter::<ArgmaxAdapter>()
            .api_base("ws://localhost:50060/v1")
            .api_key("")
            .params(owhisper_interface::ListenParams {
                model: Some("large-v3-v20240930_626MB".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .build_dual()
            .await;

        run_dual_test(client, "argmax").await;
    }
}
