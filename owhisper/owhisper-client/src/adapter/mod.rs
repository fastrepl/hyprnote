mod deepgram;

pub use deepgram::DeepgramAdapter;

use std::time::Duration;

use hypr_ws::client::{ClientRequestBuilder, Message};
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, ListenParams};

/// Trait for STT provider adapters.
///
/// This trait encapsulates provider-specific logic for:
/// - Building WebSocket URLs with provider-specific query parameters
/// - Building WebSocket requests with authentication
/// - Encoding audio and control messages to WebSocket format
/// - Decoding provider responses to the common StreamResponse format
/// - Keep-alive configuration
pub trait SttAdapter: Clone + Send + Sync + 'static {
    /// Build the WebSocket URL for this provider.
    ///
    /// # Arguments
    /// * `api_base` - The base URL for the provider's API
    /// * `params` - Listen parameters (model, languages, sample_rate, etc.)
    /// * `channels` - Number of audio channels (1 for single, 2 for dual)
    fn build_url(&self, api_base: &str, params: &ListenParams, channels: u8) -> url::Url;

    /// Build the WebSocket URL for batch transcription.
    fn build_batch_url(&self, api_base: &str, params: &ListenParams) -> url::Url;

    /// Build the WebSocket request with authentication headers.
    fn build_request(&self, url: url::Url, api_key: Option<&str>) -> ClientRequestBuilder;

    /// Encode audio bytes to a WebSocket message.
    fn encode_audio(&self, audio: bytes::Bytes) -> Message;

    /// Encode a control message to a WebSocket message.
    fn encode_control(&self, control: &ControlMessage) -> Message;

    /// Decode a WebSocket message to a StreamResponse.
    /// Returns None if the message cannot be decoded (e.g., ping/pong messages).
    fn decode_response(&self, msg: Message) -> Option<StreamResponse>;

    /// Get the keep-alive configuration for this provider.
    /// Returns None if keep-alive is not needed.
    fn keep_alive_config(&self) -> Option<(Duration, Message)>;
}
