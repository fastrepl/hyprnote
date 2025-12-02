use std::path::{Path, PathBuf};

use hypr_audio_utils::{f32_to_i16_bytes, resample_audio, source_from_path, Source};
use hypr_ws::client::Message;
use owhisper_interface::batch::Response as BatchResponse;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::ListenParams;
use url::form_urlencoded::Serializer;
use url::UrlQuery;

use super::{BatchFuture, SttAdapter};
use crate::error::Error;

const NOVA2_MULTI_LANGS: &[&str] = &["en", "es"];
const NOVA3_MULTI_LANGS: &[&str] = &["en", "es", "fr", "de", "hi", "ru", "pt", "ja", "it", "nl"];

#[derive(Clone, Default)]
pub struct DeepgramAdapter;

impl DeepgramAdapter {
    fn listen_endpoint_url(api_base: &str) -> url::Url {
        let mut url: url::Url = api_base.parse().expect("invalid_api_base");

        let mut path = url.path().to_string();
        if !path.ends_with('/') {
            path.push('/');
        }
        path.push_str("listen");
        url.set_path(&path);

        url
    }

    fn build_batch_url(api_base: &str, params: &ListenParams) -> url::Url {
        let mut url = Self::listen_endpoint_url(api_base);

        {
            let mut query_pairs = url.query_pairs_mut();

            append_language_query(&mut query_pairs, params);

            let model = params.model.as_deref().unwrap_or("hypr-whisper");
            let sample_rate = params.sample_rate.to_string();

            query_pairs.append_pair("model", model);
            query_pairs.append_pair("encoding", "linear16");
            query_pairs.append_pair("sample_rate", &sample_rate);
            query_pairs.append_pair("diarize", "true");
            query_pairs.append_pair("multichannel", "false");
            query_pairs.append_pair("punctuate", "true");
            query_pairs.append_pair("smart_format", "true");
            query_pairs.append_pair("utterances", "true");
            query_pairs.append_pair("numerals", "true");
            query_pairs.append_pair("filler_words", "false");
            query_pairs.append_pair("dictation", "false");
            query_pairs.append_pair("paragraphs", "false");
            query_pairs.append_pair("profanity_filter", "false");
            query_pairs.append_pair("measurements", "false");
            query_pairs.append_pair("topics", "false");
            query_pairs.append_pair("sentiment", "false");
            query_pairs.append_pair("intents", "false");
            query_pairs.append_pair("detect_entities", "false");
            query_pairs.append_pair("mip_opt_out", "true");

            append_keyword_query(&mut query_pairs, params);
        }

        url
    }

    // https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded
    // https://github.com/deepgram/deepgram-rust-sdk/blob/main/src/listen/rest.rs
    async fn do_transcribe_file(
        client: &reqwest::Client,
        api_base: &str,
        api_key: &str,
        params: &ListenParams,
        file_path: PathBuf,
    ) -> Result<BatchResponse, Error> {
        let (audio_data, sample_rate) = decode_audio_to_linear16(file_path).await?;

        let url = {
            let mut url = Self::build_batch_url(api_base, params);
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
}

impl SttAdapter for DeepgramAdapter {
    fn supports_native_multichannel(&self) -> bool {
        true
    }

    fn build_ws_url(&self, api_base: &str, params: &ListenParams, channels: u8) -> url::Url {
        let mut url = Self::listen_endpoint_url(api_base);

        {
            let mut query_pairs = url.query_pairs_mut();

            append_language_query(&mut query_pairs, params);

            let model = params.model.as_deref().unwrap_or("hypr-whisper");
            let channel_string = channels.to_string();
            let sample_rate = params.sample_rate.to_string();

            query_pairs.append_pair("model", model);
            query_pairs.append_pair("channels", &channel_string);
            query_pairs.append_pair("filler_words", "false");
            query_pairs.append_pair("interim_results", "true");
            query_pairs.append_pair("mip_opt_out", "true");
            query_pairs.append_pair("sample_rate", &sample_rate);
            query_pairs.append_pair("encoding", "linear16");
            query_pairs.append_pair("diarize", "true");
            query_pairs.append_pair("multichannel", "true");
            query_pairs.append_pair("punctuate", "true");
            query_pairs.append_pair("smart_format", "true");
            query_pairs.append_pair("vad_events", "false");
            query_pairs.append_pair("numerals", "true");

            let redemption_time = params.redemption_time_ms.unwrap_or(400).to_string();
            query_pairs.append_pair("redemption_time_ms", &redemption_time);

            append_keyword_query(&mut query_pairs, params);
        }

        if let Some(host) = url.host_str() {
            if host.contains("127.0.0.1") || host.contains("localhost") || host.contains("0.0.0.0")
            {
                let _ = url.set_scheme("ws");
            } else {
                let _ = url.set_scheme("wss");
            }
        }

        url
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

    fn parse_response(&self, raw: &str) -> Option<StreamResponse> {
        serde_json::from_str(raw).ok()
    }

    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a reqwest::Client,
        api_base: &'a str,
        api_key: &'a str,
        params: &'a ListenParams,
        file_path: P,
    ) -> BatchFuture<'a> {
        let path = file_path.as_ref().to_path_buf();
        Box::pin(Self::do_transcribe_file(
            client, api_base, api_key, params, path,
        ))
    }
}

fn can_use_multi(model: &str, languages: &[hypr_language::Language]) -> bool {
    if languages.len() < 2 {
        return false;
    }

    let multi_langs: &[&str] = if model.contains("nova-3") {
        NOVA3_MULTI_LANGS
    } else if model.contains("nova-2") {
        NOVA2_MULTI_LANGS
    } else {
        return false;
    };

    languages
        .iter()
        .all(|lang| multi_langs.contains(&lang.iso639().code()))
}

fn append_keyword_query<'a>(query_pairs: &mut Serializer<'a, UrlQuery>, params: &ListenParams) {
    if params.keywords.is_empty() {
        return;
    }

    let use_keyterms = params
        .model
        .as_ref()
        .map(|model| model.contains("nova-3") || model.contains("parakeet"))
        .unwrap_or(false);

    let param_name = if use_keyterms { "keyterm" } else { "keywords" };

    for keyword in &params.keywords {
        query_pairs.append_pair(param_name, keyword);
    }
}

pub(crate) fn append_language_query<'a>(
    query_pairs: &mut Serializer<'a, UrlQuery>,
    params: &ListenParams,
) {
    let model = params.model.as_deref().unwrap_or("");

    match params.languages.len() {
        0 => {
            query_pairs.append_pair("detect_language", "true");
        }
        1 => {
            if let Some(language) = params.languages.first() {
                let code = language.iso639().code();
                query_pairs.append_pair("language", code);
            }
        }
        _ => {
            if can_use_multi(model, &params.languages) {
                query_pairs.append_pair("language", "multi");
                for language in &params.languages {
                    let code = language.iso639().code();
                    query_pairs.append_pair("languages", code);
                }
            } else {
                query_pairs.append_pair("detect_language", "true");
                for language in &params.languages {
                    let code = language.iso639().code();
                    query_pairs.append_pair("languages", code);
                }
            }
        }
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

#[cfg(test)]
mod tests {
    use futures_util::StreamExt;
    use hypr_audio_utils::AudioFormatExt;

    use crate::live::ListenClientInput;
    use crate::ListenClient;

    #[tokio::test]
    async fn test_client() {
        let _ = tracing_subscriber::fmt::try_init();

        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 512);

        let input = Box::pin(tokio_stream::StreamExt::throttle(
            audio.map(|chunk| ListenClientInput::Audio(chunk)),
            std::time::Duration::from_millis(20),
        ));

        let client = ListenClient::builder()
            .api_base("https://api.deepgram.com/v1")
            .api_key("71557216ffdd13bff22702be5017e4852c052b7c")
            .params(owhisper_interface::ListenParams {
                model: Some("nova-3".to_string()),
                languages: vec![
                    hypr_language::ISO639::En.into(),
                    hypr_language::ISO639::Es.into(),
                ],
                ..Default::default()
            })
            .build_single();

        let (stream, _) = client.from_realtime_audio(input).await.unwrap();
        futures_util::pin_mut!(stream);

        while let Some(result) = stream.next().await {
            match result {
                Ok(response) => match response {
                    owhisper_interface::stream::StreamResponse::TranscriptResponse {
                        channel,
                        ..
                    } => {
                        println!("{:?}", channel.alternatives.first().unwrap().transcript);
                    }
                    _ => {}
                },
                _ => {}
            }
        }
    }
}
