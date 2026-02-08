//! Type definitions for chat completion requests and responses

use serde::{Deserialize, Serialize};

/// Role of a message in a chat conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
    Tool,
}

/// A single message in a chat conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
}

/// Tool choice configuration for function calling
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(untagged)]
pub enum ToolChoice {
    /// String tool choice like "auto", "none", or "required"
    String(String),
    /// Object specifying a specific tool to use
    Object {
        #[serde(rename = "type")]
        type_: String,
        function: serde_json::Value,
    },
}

/// Chat completion request following the OpenAI API format
#[derive(Debug, Deserialize)]
pub struct ChatCompletionRequest {
    /// Model identifier (may be overridden by the proxy)
    #[serde(default)]
    #[allow(dead_code)]
    pub model: Option<String>,

    /// Messages in the conversation
    pub messages: Vec<ChatMessage>,

    /// Available tools for function calling
    #[serde(default)]
    pub tools: Option<Vec<serde_json::Value>>,

    /// How to select tools
    #[serde(default)]
    pub tool_choice: Option<ToolChoice>,

    /// Whether to stream the response
    #[serde(default)]
    pub stream: Option<bool>,

    /// Sampling temperature (0.0 to 2.0)
    #[serde(default)]
    pub temperature: Option<f32>,

    /// Maximum tokens to generate
    #[serde(default)]
    pub max_tokens: Option<u32>,

    /// Additional provider-specific parameters
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

/// Token usage information from a completion
#[derive(Debug, Deserialize)]
pub struct UsageInfo {
    pub prompt_tokens: Option<u32>,
    pub completion_tokens: Option<u32>,
}

impl UsageInfo {
    /// Get input tokens, defaulting to 0 if not provided
    pub fn input_tokens(&self) -> u32 {
        self.prompt_tokens.unwrap_or(0)
    }

    /// Get output tokens, defaulting to 0 if not provided
    pub fn output_tokens(&self) -> u32 {
        self.completion_tokens.unwrap_or(0)
    }
}
