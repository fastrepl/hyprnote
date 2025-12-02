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
