use axum::body::Body;
use axum::http::{Request, Response};
use axum::response::IntoResponse;
use axum::Json;

use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use tower::Service;

mod error;
pub use error::*;

/// Request type for the transcription service
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TranscribeRequest {
    pub audio_data: Vec<u8>,
    pub language_code: String,
}

/// Response type for the transcription service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscribeResponse {
    pub transcript: String,
    pub confidence: f32,
}

#[derive(Clone)]
pub struct TranscribeService {
    mock_mode: bool,
}

impl TranscribeService {
    pub fn new() -> Self {
        Self { mock_mode: true }
    }

    /// Create a mock service for testing
    pub fn mock() -> Self {
        Self { mock_mode: true }
    }
}

impl Service<Request<Body>> for TranscribeService {
    type Response = Response<Body>;
    type Error = std::convert::Infallible;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let mock_mode = self.mock_mode;

        Box::pin(async move {
            // Extract the body and deserialize it
            let body = match axum::body::to_bytes(req.into_body(), usize::MAX).await {
                Ok(bytes) => bytes,
                Err(e) => {
                    let error_response = Json(serde_json::json!({
                        "error": format!("Failed to read request body: {}", e)
                    }));
                    return Ok(error_response.into_response());
                }
            };

            // Parse the JSON body into TranscribeRequest
            let transcribe_request: TranscribeRequest = match serde_json::from_slice(&body) {
                Ok(req) => req,
                Err(e) => {
                    let error_response = Json(serde_json::json!({
                        "error": format!("Invalid JSON: {}", e)
                    }));
                    return Ok(error_response.into_response());
                }
            };

            // Validate input
            if transcribe_request.audio_data.is_empty() {
                let error_response = Json(serde_json::json!({
                    "error": "Audio data is empty"
                }));
                return Ok(error_response.into_response());
            }

            // Process the request
            let response = if mock_mode {
                // Mock response for testing
                TranscribeResponse {
                    transcript: format!(
                        "Mock transcript for {} bytes of audio in {}",
                        transcribe_request.audio_data.len(),
                        transcribe_request.language_code
                    ),
                    confidence: 0.95,
                }
            } else {
                // In a real implementation, this would use AWS Transcribe
                let error_response = Json(serde_json::json!({
                    "error": "Real AWS integration not implemented"
                }));
                return Ok(error_response.into_response());
            };

            // Return successful response
            Ok(Json(response).into_response())
        })
    }
}
