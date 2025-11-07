use reqwest::StatusCode;
use tokio::task::JoinError;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("audio processing error: {0}")]
    AudioProcessing(String),
    #[error(transparent)]
    Http(#[from] reqwest::Error),
    #[error(transparent)]
    Task(#[from] JoinError),
    #[error("unexpected response status {status}: {body}")]
    UnexpectedStatus { status: StatusCode, body: String },
}
