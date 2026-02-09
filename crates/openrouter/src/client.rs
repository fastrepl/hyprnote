use std::pin::Pin;

use futures_util::{Stream, StreamExt};

use crate::error::Error;
use crate::types::{ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse};

#[derive(Debug, Clone)]
pub struct Client {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

#[derive(serde::Serialize)]
struct RequestBody<'a> {
    #[serde(flatten)]
    request: &'a ChatCompletionRequest,
    stream: bool,
}

impl Client {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            base_url: "https://openrouter.ai/api/v1".into(),
            client: reqwest::Client::new(),
        }
    }

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.base_url = base_url.into();
        self
    }

    pub async fn chat_completion(
        &self,
        req: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, Error> {
        let url = format!("{}/chat/completions", self.base_url);
        let body = RequestBody {
            request: req,
            stream: false,
        };

        let resp = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let message = resp.text().await.unwrap_or_default();
            return Err(Error::Api { status, message });
        }

        Ok(resp.json().await?)
    }

    pub async fn chat_completion_stream(
        &self,
        req: &ChatCompletionRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<ChatCompletionChunk, Error>> + Send>>, Error> {
        let url = format!("{}/chat/completions", self.base_url);
        let body = RequestBody {
            request: req,
            stream: true,
        };

        let resp = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let message = resp.text().await.unwrap_or_default();
            return Err(Error::Api { status, message });
        }

        let byte_stream = resp.bytes_stream();
        Ok(Box::pin(parse_sse_stream(byte_stream)))
    }
}

fn parse_sse_stream(
    byte_stream: impl Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Send + 'static,
) -> impl Stream<Item = Result<ChatCompletionChunk, Error>> + Send {
    async_stream::stream! {
        let mut buffer = String::new();
        futures_util::pin_mut!(byte_stream);

        while let Some(chunk) = byte_stream.next().await {
            let chunk = match chunk {
                Ok(c) => c,
                Err(e) => {
                    yield Err(Error::Http(e));
                    break;
                }
            };

            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(newline_pos) = buffer.find('\n') {
                let line = buffer[..newline_pos].trim_end().to_string();
                buffer = buffer[newline_pos + 1..].to_string();

                if line.is_empty() {
                    continue;
                }

                let Some(data) = line.strip_prefix("data: ") else {
                    continue;
                };

                let data = data.trim();

                if data == "[DONE]" {
                    return;
                }

                match serde_json::from_str::<ChatCompletionChunk>(data) {
                    Ok(chunk) => yield Ok(chunk),
                    Err(e) => yield Err(Error::Stream(e.to_string())),
                }
            }
        }
    }
}
