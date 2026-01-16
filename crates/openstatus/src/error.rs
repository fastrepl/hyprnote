use thiserror::Error;

#[derive(Debug, Error)]
pub enum OpenStatusError {
    #[error("HTTP request failed: {0}")]
    Request(#[from] reqwest::Error),

    #[error("API error: {status} - {message}")]
    Api { status: u16, message: String },

    #[error("Missing configuration: {0}")]
    MissingConfig(String),
}
