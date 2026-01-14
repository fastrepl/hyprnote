use hypr_ws_client::client::Message;
use owhisper_interface::ListenParams;
use owhisper_interface::stream::StreamResponse;

use crate::adapter::RealtimeSttAdapter;
use crate::adapter::deepgram_compat::build_listen_ws_url;

use super::{
    DeepgramAdapter, keywords::DeepgramKeywordStrategy, language::DeepgramLanguageStrategy,
};

impl RealtimeSttAdapter for DeepgramAdapter {
    fn provider_name(&self) -> &'static str {
        "deepgram"
    }

    fn is_supported_languages(
        &self,
        languages: &[hypr_language::Language],
        model: Option<&str>,
    ) -> bool {
        if languages.is_empty() {
            return false;
        }
        DeepgramAdapter::is_supported_languages_live(languages, model)
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
        api_key.and_then(|k| owhisper_providers::Provider::Deepgram.build_auth_header(k))
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
    use std::collections::HashMap;

    use crate::ListenClient;
    use crate::adapter::RealtimeSttAdapter;
    use crate::test_utils::{run_dual_test, run_single_test};

    use super::DeepgramAdapter;

    #[test]
    fn test_build_ws_url_without_custom_query() {
        let adapter = DeepgramAdapter::default();
        let params = owhisper_interface::ListenParams {
            model: Some("nova-3".to_string()),
            languages: vec![hypr_language::ISO639::En.into()],
            ..Default::default()
        };

        let url = adapter.build_ws_url("https://api.deepgram.com/v1", &params, 1);
        let url_str = url.as_str();

        assert!(url_str.contains("model=nova-3"));
        assert!(url_str.contains("channels=1"));
        assert!(!url_str.contains("redemption_time_ms="));
    }

    #[test]
    fn test_build_ws_url_with_multiple_custom_params() {
        let adapter = DeepgramAdapter::default();
        let params = owhisper_interface::ListenParams {
            model: Some("nova-3".to_string()),
            languages: vec![hypr_language::ISO639::En.into()],
            custom_query: Some(HashMap::from([
                ("redemption_time_ms".to_string(), "400".to_string()),
                ("custom_param".to_string(), "test_value".to_string()),
            ])),
            ..Default::default()
        };

        let url = adapter.build_ws_url("https://api.deepgram.com/v1", &params, 1);
        let url_str = url.as_str();

        assert!(url_str.contains("redemption_time_ms=400"));
        assert!(url_str.contains("custom_param=test_value"));
    }

    #[test]
    fn test_build_ws_url_preserves_provider_from_proxy() {
        let adapter = DeepgramAdapter::default();
        let params = owhisper_interface::ListenParams {
            model: Some("nova-3".to_string()),
            languages: vec![hypr_language::ISO639::En.into()],
            ..Default::default()
        };

        let url =
            adapter.build_ws_url("https://api.hyprnote.com/stt?provider=deepgram", &params, 1);
        let url_str = url.as_str();

        assert!(url_str.contains("provider=deepgram"));
    }

    #[test]
    fn test_build_ws_url_unsupported_multi_lang_falls_back_to_first_language() {
        let adapter = DeepgramAdapter::default();
        let params = owhisper_interface::ListenParams {
            model: Some("nova-3-general".to_string()),
            languages: vec![
                hypr_language::ISO639::En.into(),
                hypr_language::ISO639::Ko.into(),
            ],
            ..Default::default()
        };

        let url = adapter.build_ws_url("https://api.deepgram.com/v1", &params, 1);
        let url_str = url.as_str();

        assert!(
            url_str.contains("language=en"),
            "URL should fall back to first language (en) for unsupported multi-lang"
        );
        assert!(
            !url_str.contains("languages="),
            "URL should NOT contain languages= when falling back to single language"
        );
        assert!(
            !url_str.contains("language=multi"),
            "URL should NOT contain language=multi for unsupported multi-lang"
        );
        assert!(
            !url_str.contains("detect_language"),
            "URL should NOT contain detect_language (not supported with nova-3 streaming)"
        );
    }

    macro_rules! single_test {
        ($name:ident, $params:expr) => {
            #[tokio::test]
            #[ignore]
            async fn $name() {
                let client = ListenClient::builder()
                    .api_base("https://api.deepgram.com/v1")
                    .api_key(std::env::var("DEEPGRAM_API_KEY").expect("DEEPGRAM_API_KEY not set"))
                    .params($params)
                    .build_single()
                    .await;
                run_single_test(client, "deepgram").await;
            }
        };
    }

    single_test!(
        test_single_with_keywords,
        owhisper_interface::ListenParams {
            model: Some("nova-3".to_string()),
            languages: vec![hypr_language::ISO639::En.into()],
            keywords: vec!["Hyprnote".to_string(), "transcription".to_string()],
            ..Default::default()
        }
    );

    single_test!(
        test_single_multi_lang_1,
        owhisper_interface::ListenParams {
            model: Some("nova-3".to_string()),
            languages: vec![
                hypr_language::ISO639::En.into(),
                hypr_language::ISO639::Es.into(),
            ],
            ..Default::default()
        }
    );

    single_test!(
        test_single_multi_lang_2,
        owhisper_interface::ListenParams {
            model: Some("nova-3".to_string()),
            languages: vec![
                hypr_language::ISO639::En.into(),
                hypr_language::ISO639::Ko.into(),
            ],
            ..Default::default()
        }
    );

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
            .build_dual()
            .await;

        run_dual_test(client, "deepgram").await;
    }
}
