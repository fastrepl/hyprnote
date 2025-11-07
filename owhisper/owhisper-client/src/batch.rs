use std::path::{Path, PathBuf};
use tokio::task;

use hypr_audio_utils::{f32_to_i16_bytes, resample_audio, source_from_path, Source};
use owhisper_interface::batch::Response as BatchResponse;

use crate::{error::Error, ListenClientBuilder, RESAMPLED_SAMPLE_RATE_HZ};

#[derive(Clone)]
pub struct BatchClient {
    pub(crate) client: reqwest::Client,
    pub(crate) url: url::Url,
    pub(crate) api_key: Option<String>,
}

async fn decode_audio_to_linear16(path: PathBuf) -> Result<(bytes::Bytes, u16), Error> {
    task::spawn_blocking(move || -> Result<(bytes::Bytes, u16), Error> {
        let decoder =
            source_from_path(&path).map_err(|err| Error::AudioProcessing(err.to_string()))?;

        let channel_count = decoder.channels();

        let samples = resample_audio(decoder, RESAMPLED_SAMPLE_RATE_HZ)
            .map_err(|err| Error::AudioProcessing(err.to_string()))?;

        if samples.is_empty() {
            return Err(Error::AudioProcessing(
                "audio file contains no samples".to_string(),
            ));
        }

        let bytes = f32_to_i16_bytes(samples.into_iter());

        Ok((bytes, channel_count))
    })
    .await?
}

impl BatchClient {
    pub fn builder() -> ListenClientBuilder {
        ListenClientBuilder::default()
    }

    pub async fn transcribe_file<P: AsRef<Path>>(
        &self,
        file_path: P,
    ) -> Result<BatchResponse, Error> {
        let path = file_path.as_ref();
        let (audio_data, channel_count) = decode_audio_to_linear16(path.to_path_buf()).await?;

        let mut url = self.url.clone();
        let channel_value = channel_count.max(1).to_string();
        {
            let mut query_pairs = url.query_pairs_mut();
            query_pairs.append_pair("channels", &channel_value);
        }

        let mut request = self.client.post(url);

        if let Some(key) = &self.api_key {
            request = request.header("Authorization", format!("Token {}", key));
        }

        let content_type = format!(
            "audio/raw;encoding=linear16;rate={}",
            RESAMPLED_SAMPLE_RATE_HZ
        );

        let response = request
            .header("Accept", "application/json")
            .header("Content-Type", content_type)
            .body(audio_data)
            .send()
            .await?;

        let status = response.status();
        if status.is_success() {
            Ok(response.json().await?)
        } else {
            Err(Error::UnexpectedStatus {
                status,
                body: response.text().await.unwrap_or_default(),
            })
        }
    }
}
