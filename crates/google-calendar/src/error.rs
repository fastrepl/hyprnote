use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("HTTP client error: {0}")]
    Http(Box<dyn std::error::Error + Send + Sync>),

    #[error("Deserialization error: {0}")]
    Deserialization(#[from] serde_json::Error),
}
