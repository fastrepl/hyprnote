use std::path::{Path, PathBuf};

use hypr_audio_utils::{f32_to_i16_bytes, resample_audio, source_from_path, Source};
use owhisper_interface::batch::Response as BatchResponse;
use owhisper_interface::ListenParams;

use crate::adapter::deepgram_compat::build_batch_url;
use crate::adapter::{BatchFuture, BatchSttAdapter};
use crate::error::Error;

use super::{
    keywords::DeepgramKeywordStrategy, language::DeepgramLanguageStrategy, DeepgramAdapter,
};

impl BatchSttAdapter for DeepgramAdapter {
    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a reqwest::Client,
        api_base: &'a str,
        api_key: &'a str,
        params: &'a ListenParams,
        file_path: P,
    ) -> BatchFuture<'a> {
        let path = file_path.as_ref().to_path_buf();
        Box::pin(do_transcribe_file(client, api_base, api_key, params, path))
    }
}

async fn do_transcribe_file(
    client: &reqwest::Client,
    api_base: &str,
    api_key: &str,
    params: &ListenParams,
    file_path: PathBuf,
) -> Result<BatchResponse, Error> {
    let (audio_data, sample_rate) = decode_audio_to_linear16(file_path).await?;

    let url = {
        let mut url = build_batch_url(
            api_base,
            params,
            &DeepgramLanguageStrategy,
            &DeepgramKeywordStrategy,
        );
        url.query_pairs_mut()
            .append_pair("sample_rate", &sample_rate.to_string());
        url
    };

    let content_type = format!("audio/raw;encoding=linear16;rate={}", sample_rate);

    let response = client
        .post(url)
        .header("Authorization", format!("Token {}", api_key))
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

async fn decode_audio_to_linear16(path: PathBuf) -> Result<(bytes::Bytes, u32), Error> {
    tokio::task::spawn_blocking(move || -> Result<(bytes::Bytes, u32), Error> {
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
