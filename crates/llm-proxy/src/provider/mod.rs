//! Provider implementations for different LLM backends

mod openrouter;

pub use openrouter::OpenRouterProvider;

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::error::ProviderError;
use crate::types::ChatCompletionRequest;

/// Metadata extracted from a completed generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationMetadata {
    pub generation_id: String,
    pub model: Option<String>,
    pub input_tokens: u32,
    pub output_tokens: u32,
}

/// Accumulates metadata from streaming responses
pub struct StreamAccumulator {
    pub generation_id: Option<String>,
    pub model: Option<String>,
    pub input_tokens: u32,
    pub output_tokens: u32,
}

impl Default for StreamAccumulator {
    fn default() -> Self {
        Self::new()
    }
}

impl StreamAccumulator {
    pub fn new() -> Self {
        Self {
            generation_id: None,
            model: None,
            input_tokens: 0,
            output_tokens: 0,
        }
    }
}

/// Trait for LLM provider implementations
pub trait Provider: Send + Sync {
    /// Name of the provider (e.g., "openrouter")
    fn name(&self) -> &str;

    /// Base URL for API requests
    fn base_url(&self) -> &str;

    /// Build a provider-specific request from a generic chat completion request
    fn build_request(
        &self,
        request: &ChatCompletionRequest,
        models: Vec<String>,
        stream: bool,
    ) -> Result<serde_json::Value, ProviderError>;

    /// Parse a non-streaming response to extract metadata
    fn parse_response(&self, body: &[u8]) -> Result<GenerationMetadata, ProviderError>;

    /// Parse a streaming response chunk and update the accumulator
    fn parse_stream_chunk(&self, chunk: &[u8], accumulator: &mut StreamAccumulator);

    /// Fetch cost information for a completed generation (optional)
    fn fetch_cost(
        &self,
        client: &Client,
        api_key: &str,
        generation_id: &str,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Option<f64>> + Send + '_>> {
        let _ = (client, api_key, generation_id);
        Box::pin(async { None })
    }

    /// Build the authorization header value
    fn build_auth_header(&self, api_key: &str) -> String {
        format!("Bearer {}", api_key)
    }

    /// Additional headers to include in requests
    fn additional_headers(&self) -> Vec<(String, String)> {
        vec![]
    }
}
