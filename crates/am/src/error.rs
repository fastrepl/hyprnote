#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Request(#[from] reqwest::Error),

    #[error("Server returned error: {status} - {message}")]
    ServerError { status: String, message: String },

    #[error("Invalid API key format: must start with 'ax_'")]
    InvalidApiKey,

    #[error("Unexpected response from server")]
    UnexpectedResponse,
}
