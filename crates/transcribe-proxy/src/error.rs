#[derive(Debug, thiserror::Error)]
pub enum ProxyError {
    #[error("invalid upstream request: {0}")]
    InvalidRequest(String),
    #[error("upstream connection failed: {0}")]
    ConnectionFailed(String),
    #[error("upstream connection timeout")]
    ConnectionTimeout,
}
