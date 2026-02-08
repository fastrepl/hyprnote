use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Nango error: {0}")]
    Nango(#[from] hypr_nango::Error),

    #[error("Request error: {0}")]
    Request(#[from] reqwest::Error),

    #[error("Deserialization error: {0}")]
    Deserialization(#[from] serde_json::Error),
}
