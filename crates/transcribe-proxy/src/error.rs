#[derive(Debug, thiserror::Error)]
pub enum PreconnectError {
    #[error("invalid upstream request: {0}")]
    InvalidRequest(String),
    #[error("upstream connection failed: {0}")]
    ConnectionFailed(String),
    #[error("upstream connection timeout")]
    Timeout,
}
