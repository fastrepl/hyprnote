#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Extension not found: {0}")]
    ExtensionNotFound(String),

    #[error("Invalid manifest: {0}")]
    InvalidManifest(String),

    #[error("Runtime error: {0}")]
    RuntimeError(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Channel send error")]
    ChannelSend,

    #[error("Channel receive error")]
    ChannelRecv,

    #[error("Runtime unavailable: V8 engine failed to initialize")]
    RuntimeUnavailable,
}

pub type Result<T> = std::result::Result<T, Error>;
