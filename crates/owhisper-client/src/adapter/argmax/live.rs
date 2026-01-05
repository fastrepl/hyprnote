use hypr_ws_client::client::Message;
use owhisper_interface::ListenParams;
use owhisper_interface::stream::StreamResponse;

use crate::adapter::RealtimeSttAdapter;
use crate::adapter::deepgram_compat::build_listen_ws_url;

use super::{ArgmaxAdapter, keywords::ArgmaxKeywordStrategy, language::ArgmaxLanguageStrategy};

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
        match serde_json::from_str::<StreamResponse>(raw) {
            Ok(response) => vec![response],
            Err(_) => {
                if let Ok(error) = serde_json::from_str::<ArgmaxError>(raw) {
                    tracing::error!(
                        error_type = %error.error_type,
                        error_message = %error.message,
                        "argmax_error"
                    );
                    vec![StreamResponse::ErrorResponse {
                        error_code: None,
                        error_message: format!("{}: {}", error.error_type, error.message),
                        provider: "argmax".to_string(),
                    }]
                } else {
                    tracing::warn!(raw = raw, "argmax_unknown_message");
                    vec![]
                }
            }
        }
    }
}

#[derive(serde::Deserialize)]
struct ArgmaxError {
    #[serde(rename = "type")]
    error_type: String,
    message: String,
}

#[cfg(test)]
mod tests {
    use super::ArgmaxAdapter;
    use crate::ListenClient;
    use crate::test_utils::{run_dual_test, run_single_test};

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
