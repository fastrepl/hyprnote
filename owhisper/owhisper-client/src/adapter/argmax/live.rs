use hypr_ws::client::Message;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::ListenParams;

use super::ArgmaxAdapter;
use crate::adapter::RealtimeSttAdapter;

impl RealtimeSttAdapter for ArgmaxAdapter {
    fn supports_native_multichannel(&self) -> bool {
        false
    }

    fn build_ws_url(&self, api_base: &str, params: &ListenParams, channels: u8) -> url::Url {
        let adapted = Self::adapt_params(params);
        self.inner.build_ws_url(api_base, &adapted, channels)
    }

    fn build_auth_header(&self, api_key: Option<&str>) -> Option<(&'static str, String)> {
        self.inner.build_auth_header(api_key)
    }

    fn keep_alive_message(&self) -> Option<Message> {
        self.inner.keep_alive_message()
    }

    fn finalize_message(&self) -> Message {
        self.inner.finalize_message()
    }

    fn parse_response(&self, raw: &str) -> Vec<StreamResponse> {
        self.inner.parse_response(raw)
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
            .build_single();

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
            .build_dual();

        run_dual_test(client, "argmax").await;
    }
}
