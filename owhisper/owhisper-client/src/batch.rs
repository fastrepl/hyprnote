use std::path::{Path, PathBuf};
use tokio::task;

use hypr_audio_utils::{f32_to_i16_bytes, resample_audio, source_from_path, Source};
use owhisper_interface::batch::Response as BatchResponse;

use crate::{error::Error, ListenClientBuilder};

// https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded
// https://github.com/deepgram/deepgram-rust-sdk/blob/main/src/listen/rest.rs
#[derive(Clone)]
pub struct BatchClient {
    pub(crate) client: reqwest::Client,
    pub(crate) url: url::Url,
    pub(crate) api_key: Option<String>,
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
        let (audio_data, sample_rate) = decode_audio_to_linear16(path.to_path_buf()).await?;

        let params = {
            let mut params: Vec<(String, String)> = vec![];
            params.retain(|(key, _)| key != "channels");

            params.push(("sample_rate".to_string(), sample_rate.to_string()));
            params.push(("multichannel".to_string(), "false".to_string()));
            params.push(("diarize".to_string(), "true".to_string()));
            params.push(("detect_language".to_string(), "true".to_string()));
            params
        };

        let url = {
            let mut url = self.url.clone();

            let mut serializer = url::form_urlencoded::Serializer::new(String::new());
            for (key, value) in params {
                serializer.append_pair(&key, &value);
            }

            let query = serializer.finish();
            url.set_query(Some(&query));
            url
        };

        let mut request = self.client.post(url);

        if let Some(key) = &self.api_key {
            request = request.header("Authorization", format!("Token {}", key));
        }

        let content_type = format!("audio/raw;encoding=linear16;rate={}", sample_rate);

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

async fn decode_audio_to_linear16(path: PathBuf) -> Result<(bytes::Bytes, u32), Error> {
    task::spawn_blocking(move || -> Result<(bytes::Bytes, u32), Error> {
        let decoder =
            source_from_path(&path).map_err(|err| Error::AudioProcessing(err.to_string()))?;

        let channels = decoder.channels().max(1);
        let sample_rate = decoder.sample_rate();

        let samples = resample_audio(decoder, sample_rate)
            .map_err(|err| Error::AudioProcessing(err.to_string()))?;

        let samples = if channels == 1 {
            samples
        } else {
            let channels_usize = channels as usize;
            let mut mono = Vec::with_capacity(samples.len() / channels_usize);
            for frame in samples.chunks(channels_usize) {
                if frame.is_empty() {
                    continue;
                }
                let sum: f32 = frame.iter().copied().sum();
                mono.push(sum / frame.len() as f32);
            }
            mono
        };

        if samples.is_empty() {
            return Err(Error::AudioProcessing(
                "audio file contains no samples".to_string(),
            ));
        }

        let bytes = f32_to_i16_bytes(samples.into_iter());

        Ok((bytes, sample_rate))
    })
    .await?
}
