#[derive(Debug, thiserror::Error)]
pub enum PreconnectError {
    #[error("invalid upstream request: {0}")]
    InvalidRequest(String),
    #[error("upstream connection failed: {0}")]
    ConnectionFailed(String),
    #[error("upstream connection timeout")]
    Timeout,
}

#[derive(Debug, thiserror::Error)]
pub enum ProxyError {
    #[error("invalid upstream request: {0}")]
    InvalidRequest(String),
    #[error("upstream connection failed: {0}")]
    ConnectionFailed(String),
    #[error("upstream connection timeout")]
    ConnectionTimeout,
}

impl From<PreconnectError> for ProxyError {
    fn from(e: PreconnectError) -> Self {
        match e {
            PreconnectError::InvalidRequest(s) => ProxyError::InvalidRequest(s),
            PreconnectError::ConnectionFailed(s) => ProxyError::ConnectionFailed(s),
            PreconnectError::Timeout => ProxyError::ConnectionTimeout,
        }
    }
}
