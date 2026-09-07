//! Streaming chat generation against the configured language model: the
//! `streamText` call of the AI tasks, over the provider shapes
//! `useLLMConnection`'s `createProviderModel` picks (OpenAI-compatible chat
//! completions, Anthropic messages, Gemini `streamGenerateContent`), with
//! `extractReasoningMiddleware`'s `<think>` / `<thinking>` handling and
//! `reasoningProviderOptions`.

use std::time::Duration;

use futures_util::StreamExt as _;
use serde_json::{Value, json};
use tokio::sync::mpsc;

/// `maxRetries: 4` on `streamText`.
const MAX_RETRIES: usize = 4;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Chunk {
    TextDelta(String),
    ReasoningDelta(String),
    Done,
    Error(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Connection {
    pub provider_id: String,
    pub base_url: String,
    pub api_key: String,
    pub model_id: String,
    /// `default` / `low` / `medium` / `high`.
    pub reasoning_effort: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Request {
    pub system: String,
    /// The final user message.
    pub prompt: String,
    /// `0` leaves the provider's default in place (the chat sets no cap).
    pub max_output_tokens: u32,
    /// Earlier conversation turns before `prompt`, oldest first.
    pub history: Vec<Turn>,
}

impl Request {
    pub fn new(
        system: impl Into<String>,
        prompt: impl Into<String>,
        max_output_tokens: u32,
    ) -> Self {
        Self {
            system: system.into(),
            prompt: prompt.into(),
            max_output_tokens,
            history: Vec::new(),
        }
    }
}

/// One earlier message of a multi-turn chat.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Turn {
    pub role: TurnRole,
    pub text: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TurnRole {
    User,
    Assistant,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Family {
    OpenAiCompatible,
    Anthropic,
    Google,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HttpRequest {
    pub url: String,
    pub headers: Vec<(&'static str, String)>,
    pub body: Value,
    family: Family,
}

/// `isLocalModelProviderId`: on-device servers get the long start timeout.
pub fn is_local_model_provider(provider_id: &str) -> bool {
    matches!(
        provider_id,
        "apple_foundation" | "lmstudio" | "ollama" | "unsloth"
    )
}

/// `reasoningProviderOptions`, already in each provider's wire format.
fn reasoning_options(conn: &Connection) -> Option<Value> {
    let effort = conn.reasoning_effort.as_str();
    if effort == "default" || !crate::ai_models::supports_reasoning_effort(&conn.provider_id) {
        return None;
    }
    Some(match conn.provider_id.as_str() {
        "openai" | "chatgpt" | "azure_openai" => json!({ "reasoning_effort": effort }),
        "anthropic" | "claude" => json!({
            "thinking": { "type": "adaptive" },
            "output_config": { "effort": effort }
        }),
        "openrouter" => json!({ "reasoning": { "effort": effort } }),
        "google_generative_ai" => {
            let version = regex::Regex::new(r"gemini-(\d+)(?:\.(\d+))?").ok()?;
            let captures = version.captures(&conn.model_id)?;
            let major: u32 = captures.get(1)?.as_str().parse().ok()?;
            let minor: u32 = captures
                .get(2)
                .map(|m| m.as_str().parse().unwrap_or(0))
                .unwrap_or(0);
            if major >= 3 {
                json!({ "thinkingConfig": { "thinkingLevel": effort } })
            } else if major == 2 && minor == 5 {
                let budget = match effort {
                    "low" => 1024,
                    "medium" => 8192,
                    _ => 24576,
                };
                json!({ "thinkingConfig": { "thinkingBudget": budget } })
            } else {
                return None;
            }
        }
        _ => json!({ "reasoning_effort": effort }),
    })
}

fn merge(target: &mut Value, extra: Option<Value>) {
    if let (Some(target), Some(Value::Object(extra))) = (target.as_object_mut(), extra) {
        for (key, value) in extra {
            target.insert(key, value);
        }
    }
}

/// The HTTP request for one generation attempt.
pub fn build_request(conn: &Connection, request: &Request) -> Result<HttpRequest, String> {
    let base = conn.base_url.trim_end_matches('/');
    if base.is_empty() {
        return Err("The language model provider has no base URL.".to_string());
    }
    let api_key = conn.api_key.as_str();
    let model = conn.model_id.as_str();
    let turns = |assistant_role: &str| -> Vec<Value> {
        request
            .history
            .iter()
            .map(|turn| {
                json!({
                    "role": match turn.role {
                        TurnRole::User => "user",
                        TurnRole::Assistant => assistant_role,
                    },
                    "content": turn.text
                })
            })
            .chain(std::iter::once(
                json!({ "role": "user", "content": request.prompt }),
            ))
            .collect()
    };
    let mut openai_messages = vec![json!({ "role": "system", "content": request.system })];
    openai_messages.extend(turns("assistant"));
    let mut openai_body = json!({
        "model": model,
        "stream": true,
        "messages": openai_messages
    });
    if request.max_output_tokens > 0 {
        merge(
            &mut openai_body,
            Some(json!({ "max_tokens": request.max_output_tokens })),
        );
    }
    Ok(match conn.provider_id.as_str() {
        "anarlog" | "claude" | "chatgpt" | "grok" | "github_copilot" | "apple_foundation" => {
            return Err(format!(
                "The {} provider needs the account flows, which the native shell does not ship yet.",
                conn.provider_id
            ));
        }
        "anthropic" => {
            let mut body = json!({
                "model": model,
                "stream": true,
                // Anthropic requires the cap; the SDK's default for chat.
                "max_tokens": if request.max_output_tokens > 0 { request.max_output_tokens } else { 4096 },
                "system": request.system,
                "messages": turns("assistant")
            });
            merge(&mut body, reasoning_options(conn));
            HttpRequest {
                url: format!("{base}/messages"),
                headers: vec![
                    ("x-api-key", api_key.to_string()),
                    ("anthropic-version", "2023-06-01".to_string()),
                    (
                        "anthropic-dangerous-direct-browser-access",
                        "true".to_string(),
                    ),
                ],
                body,
                family: Family::Anthropic,
            }
        }
        "google_generative_ai" => {
            let mut generation_config = json!({});
            if request.max_output_tokens > 0 {
                generation_config = json!({ "maxOutputTokens": request.max_output_tokens });
            }
            merge(&mut generation_config, reasoning_options(conn));
            let contents: Vec<Value> = turns("model")
                .into_iter()
                .map(|message| {
                    json!({
                        "role": message["role"],
                        "parts": [{ "text": message["content"] }]
                    })
                })
                .collect();
            HttpRequest {
                url: format!("{base}/models/{model}:streamGenerateContent?alt=sse"),
                headers: vec![("x-goog-api-key", api_key.to_string())],
                body: json!({
                    "systemInstruction": { "parts": [{ "text": request.system }] },
                    "contents": contents,
                    "generationConfig": generation_config
                }),
                family: Family::Google,
            }
        }
        "azure_openai" => {
            merge(&mut openai_body, reasoning_options(conn));
            HttpRequest {
                url: format!(
                    "{base}/openai/deployments/{model}/chat/completions?api-version=2024-10-21"
                ),
                headers: vec![("api-key", api_key.to_string())],
                body: openai_body,
                family: Family::OpenAiCompatible,
            }
        }
        "azure_ai" => {
            merge(&mut openai_body, reasoning_options(conn));
            HttpRequest {
                url: format!("{base}/chat/completions"),
                headers: vec![
                    ("api-key", api_key.to_string()),
                    ("Authorization", format!("Bearer {api_key}")),
                ],
                body: openai_body,
                family: Family::OpenAiCompatible,
            }
        }
        provider => {
            merge(&mut openai_body, reasoning_options(conn));
            HttpRequest {
                url: format!("{base}/chat/completions"),
                headers: if api_key.is_empty() || provider == "ollama" {
                    Vec::new()
                } else {
                    vec![("Authorization", format!("Bearer {api_key}"))]
                },
                body: openai_body,
                family: Family::OpenAiCompatible,
            }
        }
    })
}

/// One SSE `data:` payload → the deltas it carries.
fn parse_event(family: Family, data: &str) -> Vec<Chunk> {
    if data.trim() == "[DONE]" {
        return vec![Chunk::Done];
    }
    let Ok(value) = serde_json::from_str::<Value>(data) else {
        return Vec::new();
    };
    let mut chunks = Vec::new();
    match family {
        Family::OpenAiCompatible => {
            if let Some(error) = value.get("error") {
                chunks.push(Chunk::Error(api_error_message(error)));
                return chunks;
            }
            let Some(choice) = value
                .get("choices")
                .and_then(|c| c.as_array())
                .and_then(|c| c.first())
            else {
                return chunks;
            };
            if let Some(delta) = choice.get("delta") {
                for key in ["reasoning_content", "reasoning"] {
                    if let Some(text) = delta.get(key).and_then(|t| t.as_str())
                        && !text.is_empty()
                    {
                        chunks.push(Chunk::ReasoningDelta(text.to_string()));
                    }
                }
                if let Some(text) = delta.get("content").and_then(|t| t.as_str())
                    && !text.is_empty()
                {
                    chunks.push(Chunk::TextDelta(text.to_string()));
                }
            }
            if choice
                .get("finish_reason")
                .and_then(|f| f.as_str())
                .is_some_and(|f| !f.is_empty())
            {
                chunks.push(Chunk::Done);
            }
        }
        Family::Anthropic => match value.get("type").and_then(|t| t.as_str()) {
            Some("content_block_delta") => {
                if let Some(delta) = value.get("delta") {
                    match delta.get("type").and_then(|t| t.as_str()) {
                        Some("text_delta") => {
                            if let Some(text) = delta.get("text").and_then(|t| t.as_str()) {
                                chunks.push(Chunk::TextDelta(text.to_string()));
                            }
                        }
                        Some("thinking_delta") => {
                            if let Some(text) = delta.get("thinking").and_then(|t| t.as_str()) {
                                chunks.push(Chunk::ReasoningDelta(text.to_string()));
                            }
                        }
                        _ => {}
                    }
                }
            }
            Some("message_stop") => chunks.push(Chunk::Done),
            Some("error") => {
                chunks.push(Chunk::Error(api_error_message(
                    value.get("error").unwrap_or(&Value::Null),
                )));
            }
            _ => {}
        },
        Family::Google => {
            if let Some(error) = value.get("error") {
                chunks.push(Chunk::Error(api_error_message(error)));
                return chunks;
            }
            let parts = value
                .get("candidates")
                .and_then(|c| c.as_array())
                .and_then(|c| c.first())
                .and_then(|c| c.get("content"))
                .and_then(|c| c.get("parts"))
                .and_then(|p| p.as_array());
            for part in parts.into_iter().flatten() {
                if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                    if part.get("thought").and_then(|t| t.as_bool()) == Some(true) {
                        chunks.push(Chunk::ReasoningDelta(text.to_string()));
                    } else {
                        chunks.push(Chunk::TextDelta(text.to_string()));
                    }
                }
            }
            if value
                .get("candidates")
                .and_then(|c| c.as_array())
                .and_then(|c| c.first())
                .and_then(|c| c.get("finishReason"))
                .and_then(|f| f.as_str())
                .is_some()
            {
                chunks.push(Chunk::Done);
            }
        }
    }
    chunks
}

fn api_error_message(error: &Value) -> String {
    error
        .get("message")
        .and_then(|m| m.as_str())
        .map(str::to_string)
        .or_else(|| error.as_str().map(str::to_string))
        .unwrap_or_else(|| error.to_string())
}

/// `extractReasoningMiddleware({ tagName })` for `think` and `thinking`:
/// text inside the tags becomes reasoning; the tags themselves vanish.
#[derive(Debug, Default)]
pub struct ReasoningExtractor {
    pending: String,
    inside: Option<&'static str>,
}

const TAGS: [&str; 2] = ["thinking", "think"];

impl ReasoningExtractor {
    pub fn push(&mut self, text: &str) -> Vec<Chunk> {
        self.pending.push_str(text);
        let mut out = Vec::new();
        loop {
            match self.inside {
                None => {
                    // Emit everything up to a possible opening tag.
                    let Some(lt) = self.pending.find('<') else {
                        if !self.pending.is_empty() {
                            out.push(Chunk::TextDelta(std::mem::take(&mut self.pending)));
                        }
                        break;
                    };
                    if lt > 0 {
                        out.push(Chunk::TextDelta(self.pending[..lt].to_string()));
                        self.pending = self.pending[lt..].to_string();
                    }
                    let mut matched = None;
                    let mut could_match = false;
                    for tag in TAGS {
                        let open = format!("<{tag}>");
                        if self.pending.starts_with(&open) {
                            matched = Some((tag, open.len()));
                            break;
                        }
                        if open.starts_with(&self.pending) {
                            could_match = true;
                        }
                    }
                    match matched {
                        Some((tag, len)) => {
                            self.pending = self.pending[len..].to_string();
                            self.inside = Some(tag);
                        }
                        None if could_match => break,
                        None => {
                            // A `<` that is not one of our tags: emit it.
                            out.push(Chunk::TextDelta(self.pending[..1].to_string()));
                            self.pending = self.pending[1..].to_string();
                        }
                    }
                }
                Some(tag) => {
                    let close = format!("</{tag}>");
                    if let Some(end) = self.pending.find(&close) {
                        if end > 0 {
                            out.push(Chunk::ReasoningDelta(self.pending[..end].to_string()));
                        }
                        self.pending = self.pending[end + close.len()..].to_string();
                        self.inside = None;
                        // The middleware drops the newline right after the tag.
                        if let Some(rest) = self.pending.strip_prefix('\n') {
                            self.pending = rest.to_string();
                        }
                    } else {
                        // Keep a possible partial closing tag buffered.
                        let keep = (0..close.len())
                            .rev()
                            .find(|len| self.pending.ends_with(&close[..*len]))
                            .unwrap_or(0);
                        let emit_to = self.pending.len() - keep;
                        if emit_to > 0 {
                            out.push(Chunk::ReasoningDelta(self.pending[..emit_to].to_string()));
                            self.pending = self.pending[emit_to..].to_string();
                        }
                        break;
                    }
                }
            }
        }
        out
    }

    pub fn finish(&mut self) -> Vec<Chunk> {
        let rest = std::mem::take(&mut self.pending);
        if rest.is_empty() {
            return Vec::new();
        }
        vec![match self.inside {
            Some(_) => Chunk::ReasoningDelta(rest),
            None => Chunk::TextDelta(rest),
        }]
    }
}

fn retryable_status(status: u16) -> bool {
    matches!(status, 408 | 409 | 429) || status >= 500
}

/// Start a generation: chunks arrive on the receiver until `Done` or
/// `Error`; dropping the receiver cancels the request.
pub fn stream(
    runtime: &tokio::runtime::Handle,
    conn: Connection,
    request: Request,
) -> mpsc::UnboundedReceiver<Chunk> {
    let (sender, receiver) = mpsc::unbounded_channel();
    runtime.spawn(async move {
        let http = match build_request(&conn, &request) {
            Ok(http) => http,
            Err(error) => {
                let _ = sender.send(Chunk::Error(error));
                return;
            }
        };
        let client = match reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(30))
            .build()
        {
            Ok(client) => client,
            Err(error) => {
                let _ = sender.send(Chunk::Error(error.to_string()));
                return;
            }
        };
        let mut attempt = 0;
        loop {
            match run_once(&client, &http, &sender).await {
                Ok(()) => return,
                Err(Retry::Give(message)) => {
                    let _ = sender.send(Chunk::Error(message));
                    return;
                }
                Err(Retry::Again(message)) => {
                    attempt += 1;
                    if attempt > MAX_RETRIES || sender.is_closed() {
                        let _ = sender.send(Chunk::Error(message));
                        return;
                    }
                    // The AI SDK's exponential backoff: 2s, 4s, 8s, 16s.
                    tokio::time::sleep(Duration::from_secs(1 << attempt)).await;
                }
            }
        }
    });
    receiver
}

enum Retry {
    Again(String),
    Give(String),
}

async fn run_once(
    client: &reqwest::Client,
    http: &HttpRequest,
    sender: &mpsc::UnboundedSender<Chunk>,
) -> Result<(), Retry> {
    let mut builder = client.post(&http.url).json(&http.body);
    for (name, value) in &http.headers {
        builder = builder.header(*name, value);
    }
    let response = builder.send().await.map_err(|error| {
        if error.is_connect() || error.is_timeout() || error.is_request() {
            Retry::Again(error.to_string())
        } else {
            Retry::Give(error.to_string())
        }
    })?;
    let status = response.status().as_u16();
    if status >= 400 {
        let body = response.text().await.unwrap_or_default();
        let message = crate::ai_health::llm_health_error_message(status, &body);
        return Err(if retryable_status(status) {
            Retry::Again(message)
        } else {
            Retry::Give(message)
        });
    }

    let mut body = response.bytes_stream();
    let mut buffer = String::new();
    let mut extractor = ReasoningExtractor::default();
    let mut emitted_any = false;
    let mut data_lines: Vec<String> = Vec::new();
    let mut finished = false;
    let deliver = |sender: &mpsc::UnboundedSender<Chunk>, chunks: Vec<Chunk>| -> bool {
        for chunk in chunks {
            if sender.send(chunk).is_err() {
                return false;
            }
        }
        true
    };
    while let Some(next) = body.next().await {
        let bytes = match next {
            Ok(bytes) => bytes,
            Err(error) => {
                return Err(if emitted_any {
                    Retry::Give(error.to_string())
                } else {
                    Retry::Again(error.to_string())
                });
            }
        };
        buffer.push_str(&String::from_utf8_lossy(&bytes));
        while let Some(newline) = buffer.find('\n') {
            let line = buffer[..newline].trim_end_matches('\r').to_string();
            buffer = buffer[newline + 1..].to_string();
            if line.is_empty() {
                // Event boundary.
                if !data_lines.is_empty() {
                    let data = data_lines.join("\n");
                    data_lines.clear();
                    for chunk in parse_event(http.family, &data) {
                        match chunk {
                            Chunk::TextDelta(text) => {
                                emitted_any = true;
                                if !deliver(sender, extractor.push(&text)) {
                                    return Ok(());
                                }
                            }
                            Chunk::Done => finished = true,
                            other => {
                                emitted_any = true;
                                if !deliver(sender, vec![other]) {
                                    return Ok(());
                                }
                            }
                        }
                    }
                }
                continue;
            }
            if let Some(data) = line.strip_prefix("data:") {
                data_lines.push(data.strip_prefix(' ').unwrap_or(data).to_string());
            }
        }
        if sender.is_closed() {
            return Ok(());
        }
    }
    if !data_lines.is_empty() {
        let data = data_lines.join("\n");
        for chunk in parse_event(http.family, &data) {
            match chunk {
                Chunk::TextDelta(text) => {
                    deliver(sender, extractor.push(&text));
                }
                Chunk::Done => finished = true,
                other => {
                    deliver(sender, vec![other]);
                }
            }
        }
    }
    deliver(sender, extractor.finish());
    let _ = finished;
    let _ = sender.send(Chunk::Done);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn conn(provider: &str, model: &str, effort: &str) -> Connection {
        Connection {
            provider_id: provider.into(),
            base_url: "https://api.example/v1/".into(),
            api_key: "k".into(),
            model_id: model.into(),
            reasoning_effort: effort.into(),
        }
    }

    fn request() -> Request {
        Request::new("sys", "hi", 8192)
    }

    #[test]
    fn history_turns_precede_the_prompt_per_family() {
        let mut request = Request::new("sys", "third", 0);
        request.history = vec![
            Turn {
                role: TurnRole::User,
                text: "first".into(),
            },
            Turn {
                role: TurnRole::Assistant,
                text: "second".into(),
            },
        ];
        let openai = build_request(&conn("openai", "gpt-5.6", "default"), &request).unwrap();
        assert_eq!(
            openai.body["messages"],
            json!([
                { "role": "system", "content": "sys" },
                { "role": "user", "content": "first" },
                { "role": "assistant", "content": "second" },
                { "role": "user", "content": "third" }
            ])
        );
        // No cap requested: the provider default stands.
        assert!(openai.body.get("max_tokens").is_none());
        let anthropic = build_request(&conn("anthropic", "claude", "default"), &request).unwrap();
        assert_eq!(anthropic.body["messages"].as_array().unwrap().len(), 3);
        assert_eq!(anthropic.body["max_tokens"], 4096);
        let google =
            build_request(&conn("google_generative_ai", "gemini", "default"), &request).unwrap();
        assert_eq!(google.body["contents"][1]["role"], "model");
        assert_eq!(google.body["contents"][2]["parts"][0]["text"], "third");
    }

    #[test]
    fn requests_follow_the_provider_family() {
        let openai = build_request(&conn("openai", "gpt-5.6", "high"), &request()).unwrap();
        assert_eq!(openai.url, "https://api.example/v1/chat/completions");
        assert_eq!(openai.body["stream"], json!(true));
        assert_eq!(openai.body["reasoning_effort"], json!("high"));
        assert_eq!(openai.body["messages"][0]["role"], json!("system"));

        let custom = build_request(&conn("custom", "m", "default"), &request()).unwrap();
        assert!(custom.body.get("reasoning_effort").is_none());
        assert_eq!(
            custom.headers,
            vec![("Authorization", "Bearer k".to_string())]
        );

        let anthropic = build_request(&conn("anthropic", "claude", "low"), &request()).unwrap();
        assert_eq!(anthropic.url, "https://api.example/v1/messages");
        assert_eq!(anthropic.body["system"], json!("sys"));
        assert_eq!(anthropic.body["thinking"]["type"], json!("adaptive"));
        assert_eq!(anthropic.body["output_config"]["effort"], json!("low"));

        let google = build_request(
            &conn("google_generative_ai", "gemini-2.5-pro", "medium"),
            &request(),
        )
        .unwrap();
        assert_eq!(
            google.url,
            "https://api.example/v1/models/gemini-2.5-pro:streamGenerateContent?alt=sse"
        );
        assert_eq!(
            google.body["generationConfig"]["thinkingConfig"]["thinkingBudget"],
            json!(8192)
        );
        let gemini3 = build_request(
            &conn("google_generative_ai", "gemini-3.8-flash", "high"),
            &request(),
        )
        .unwrap();
        assert_eq!(
            gemini3.body["generationConfig"]["thinkingConfig"]["thinkingLevel"],
            json!("high")
        );
        let old = build_request(
            &conn("google_generative_ai", "gemini-1.5-pro", "high"),
            &request(),
        )
        .unwrap();
        assert!(old.body["generationConfig"].get("thinkingConfig").is_none());

        let openrouter = build_request(&conn("openrouter", "m", "low"), &request()).unwrap();
        assert_eq!(openrouter.body["reasoning"]["effort"], json!("low"));

        let ollama = build_request(&conn("ollama", "llama", "default"), &request()).unwrap();
        assert!(ollama.headers.is_empty());

        assert!(build_request(&conn("anarlog", "m", "default"), &request()).is_err());
        assert!(build_request(&conn("apple_foundation", "m", "default"), &request()).is_err());
    }

    #[test]
    fn events_parse_per_family() {
        assert_eq!(
            parse_event(
                Family::OpenAiCompatible,
                r#"{"choices":[{"delta":{"content":"Hel","reasoning_content":"why"}}]}"#
            ),
            vec![
                Chunk::ReasoningDelta("why".into()),
                Chunk::TextDelta("Hel".into())
            ]
        );
        assert_eq!(
            parse_event(
                Family::OpenAiCompatible,
                r#"{"choices":[{"delta":{},"finish_reason":"stop"}]}"#
            ),
            vec![Chunk::Done]
        );
        assert_eq!(
            parse_event(Family::OpenAiCompatible, "[DONE]"),
            vec![Chunk::Done]
        );
        assert_eq!(
            parse_event(Family::OpenAiCompatible, r#"{"error":{"message":"boom"}}"#),
            vec![Chunk::Error("boom".into())]
        );
        assert_eq!(
            parse_event(
                Family::Anthropic,
                r#"{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}"#
            ),
            vec![Chunk::TextDelta("Hi".into())]
        );
        assert_eq!(
            parse_event(
                Family::Anthropic,
                r#"{"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"hm"}}"#
            ),
            vec![Chunk::ReasoningDelta("hm".into())]
        );
        assert_eq!(
            parse_event(Family::Anthropic, r#"{"type":"message_stop"}"#),
            vec![Chunk::Done]
        );
        assert_eq!(
            parse_event(
                Family::Google,
                r#"{"candidates":[{"content":{"parts":[{"text":"t","thought":true},{"text":"x"}]},"finishReason":"STOP"}]}"#
            ),
            vec![
                Chunk::ReasoningDelta("t".into()),
                Chunk::TextDelta("x".into()),
                Chunk::Done
            ]
        );
    }

    #[test]
    fn reasoning_tags_are_extracted_across_chunks() {
        let mut extractor = ReasoningExtractor::default();
        let mut out = Vec::new();
        for piece in ["<thi", "nk>plan", " more</thi", "nk>\n# Title", " a < b"] {
            out.extend(extractor.push(piece));
        }
        out.extend(extractor.finish());
        let text: String = out
            .iter()
            .filter_map(|c| match c {
                Chunk::TextDelta(t) => Some(t.as_str()),
                _ => None,
            })
            .collect();
        let reasoning: String = out
            .iter()
            .filter_map(|c| match c {
                Chunk::ReasoningDelta(t) => Some(t.as_str()),
                _ => None,
            })
            .collect();
        assert_eq!(text, "# Title a < b");
        assert_eq!(reasoning, "plan more");
    }

    #[test]
    fn local_providers_are_recognised() {
        assert!(is_local_model_provider("ollama"));
        assert!(is_local_model_provider("lmstudio"));
        assert!(!is_local_model_provider("openai"));
    }
}
