use hypr_ws::client::Message;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::ListenParams;

use crate::adapter::deepgram_compat::build_listen_ws_url;
use crate::adapter::RealtimeSttAdapter;

use super::{
    keywords::DeepgramKeywordStrategy, language::DeepgramLanguageStrategy, DeepgramAdapter,
};

impl RealtimeSttAdapter for DeepgramAdapter {
    fn provider_name(&self) -> &'static str {
        "deepgram"
    }

    fn supports_native_multichannel(&self) -> bool {
        true
    }

    fn build_ws_url(&self, api_base: &str, params: &ListenParams, channels: u8) -> url::Url {
        build_listen_ws_url(
            api_base,
            params,
            channels,
            &DeepgramLanguageStrategy,
            &DeepgramKeywordStrategy,
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
    use super::DeepgramAdapter;

    crate::adapter_integration_tests! {
        adapter: DeepgramAdapter,
        provider: "deepgram",
        api_base: "https://api.deepgram.com/v1",
        api_key_env: "DEEPGRAM_API_KEY",
        params: owhisper_interface::ListenParams {
            model: Some("nova-3".to_string()),
            languages: vec![hypr_language::ISO639::En.into()],
            ..Default::default()
        }
    }
}
