use std::path::Path;

use hypr_ws::client::Message;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::ListenParams;

use super::{BatchFuture, DeepgramAdapter, SttAdapter};

const PARAKEET_V3_LANGS: &[&str] = &[
    "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr", "hr", "hu", "it", "lt", "lv", "mt",
    "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "uk",
];

#[derive(Clone, Default)]
pub struct ArgmaxAdapter {
    inner: DeepgramAdapter,
}

impl ArgmaxAdapter {
    fn adapt_params(params: &ListenParams) -> ListenParams {
        let mut adapted = params.clone();
        let model = params.model.as_deref().unwrap_or("");

        let lang = if model.contains("parakeet") && model.contains("v2") {
            hypr_language::ISO639::En.into()
        } else if model.contains("parakeet") && model.contains("v3") {
            params
                .languages
                .iter()
                .find(|lang| PARAKEET_V3_LANGS.contains(&lang.iso639().code()))
                .cloned()
                .unwrap_or_else(|| hypr_language::ISO639::En.into())
        } else {
            params
                .languages
                .first()
                .cloned()
                .unwrap_or_else(|| hypr_language::ISO639::En.into())
        };

        adapted.languages = vec![lang];
        adapted
    }
}

impl SttAdapter for ArgmaxAdapter {
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

    fn parse_response(&self, raw: &str) -> Option<StreamResponse> {
        self.inner.parse_response(raw)
    }

    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a reqwest::Client,
        api_base: &'a str,
        api_key: &'a str,
        params: &'a ListenParams,
        file_path: P,
    ) -> BatchFuture<'a> {
        self.inner
            .transcribe_file(client, api_base, api_key, params, file_path)
    }
}

#[cfg(test)]
mod tests {
    use super::ArgmaxAdapter;

    use futures_util::StreamExt;
    use hypr_audio_utils::AudioFormatExt;

    use crate::live::ListenClientInput;
    use crate::ListenClientBuilder;

    #[tokio::test]
    async fn test_client() {
        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 16000);

        let input = Box::pin(tokio_stream::StreamExt::throttle(
            audio.map(|chunk| ListenClientInput::Audio(bytes::Bytes::from(chunk.to_vec()))),
            std::time::Duration::from_millis(20),
        ));

        let client = ListenClientBuilder::default()
            .api_base("ws://localhost:50060/v1")
            .api_key("".to_string())
            .params(owhisper_interface::ListenParams {
                model: Some("large-v3-v20240930_626MB".to_string()),
                languages: vec![hypr_language::ISO639::En.into()],
                ..Default::default()
            })
            .adapter::<ArgmaxAdapter>()
            .build_single();

        let (stream, _) = client.from_realtime_audio(input).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            println!("{:?}", result);
        }
    }
}
