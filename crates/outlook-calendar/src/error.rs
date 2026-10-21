use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Outlook returned an invalid pagination link")]
    InvalidNextLink,

    #[error("Outlook returned a repeated pagination link")]
    RepeatedNextLink,

    #[error("Outlook pagination exceeded the page limit")]
    TooManyPages,

    #[error("HTTP client error: {0}")]
    Http(Box<dyn std::error::Error + Send + Sync>),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}
