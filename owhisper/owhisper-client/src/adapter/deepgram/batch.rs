use std::path::{Path, PathBuf};

use owhisper_interface::batch::Response as BatchResponse;
use owhisper_interface::ListenParams;

use crate::adapter::audio::decode_audio_to_linear16;
use crate::adapter::deepgram_compat::build_batch_url;
use crate::adapter::http::ensure_success;
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

    let response = ensure_success(response).await?;
    Ok(response.json().await?)
}
