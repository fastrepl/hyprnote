use std::time::Duration;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("connection failed: {0}")]
    Connection(#[from] tokio_tungstenite::tungstenite::Error),

    #[error("connection timeout after {timeout:?}")]
    Timeout {
        #[source]
        source: tokio::time::error::Elapsed,
        timeout: Duration,
    },

    #[error("failed to send control command")]
    ControlSend,

    #[error("failed to send data: {context}")]
    DataSend { context: String },

    #[error("connection closed unexpectedly")]
    UnexpectedClose,

    #[error("invalid client request: {0}")]
    InvalidRequest(String),

    #[error("message parsing failed: {message}")]
    ParseError { message: String },
}

impl Error {
    pub fn timeout(elapsed: tokio::time::error::Elapsed, duration: Duration) -> Self {
        Self::Timeout {
            source: elapsed,
            timeout: duration,
        }
    }

    pub fn data_send(context: impl Into<String>) -> Self {
        Self::DataSend {
            context: context.into(),
        }
    }

    pub fn parse_error(message: impl Into<String>) -> Self {
        Self::ParseError {
            message: message.into(),
        }
    }
}
