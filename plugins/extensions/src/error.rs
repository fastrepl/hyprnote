use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error, Serialize, Deserialize, specta::Type)]
pub enum Error {
    #[error("Extension not found: {0}")]
    ExtensionNotFound(String),
    #[error("Runtime error: {0}")]
    RuntimeError(String),
    #[error("Invalid manifest: {0}")]
    InvalidManifest(String),
    #[error("IO error: {0}")]
    Io(String),
    #[error("Runtime unavailable: V8 engine failed to initialize")]
    RuntimeUnavailable,
    #[error("Network error: {0}")]
    Network(String),
    #[error("Checksum mismatch: expected {expected}, got {actual}")]
    ChecksumMismatch { expected: String, actual: String },
    #[error("Zip extraction error: {0}")]
    ZipError(String),
}

impl From<hypr_extensions_runtime::Error> for Error {
    fn from(err: hypr_extensions_runtime::Error) -> Self {
        match err {
            hypr_extensions_runtime::Error::ExtensionNotFound(id) => Error::ExtensionNotFound(id),
            hypr_extensions_runtime::Error::RuntimeError(msg) => Error::RuntimeError(msg),
            hypr_extensions_runtime::Error::InvalidManifest(msg) => Error::InvalidManifest(msg),
            hypr_extensions_runtime::Error::Io(e) => Error::Io(e.to_string()),
            hypr_extensions_runtime::Error::Json(e) => Error::RuntimeError(e.to_string()),
            hypr_extensions_runtime::Error::ChannelSend => {
                Error::RuntimeError("Channel send error".to_string())
            }
            hypr_extensions_runtime::Error::ChannelRecv => {
                Error::RuntimeError("Channel receive error".to_string())
            }
            hypr_extensions_runtime::Error::RuntimeUnavailable => Error::RuntimeUnavailable,
        }
    }
}
