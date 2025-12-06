#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("audio processing error: {0}")]
    AudioProcessing(String),
    #[error(transparent)]
    Http(#[from] reqwest::Error),
    #[error(transparent)]
    HttpMiddleware(#[from] reqwest_middleware::Error),
    #[error(transparent)]
    Task(#[from] tokio::task::JoinError),
    #[error("unexpected response status {status}: {body}")]
    UnexpectedStatus {
        status: reqwest::StatusCode,
        body: String,
    },
}
