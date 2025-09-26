use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    AmError(#[from] hypr_am::Error),
    #[error(transparent)]
    HyprFileError(#[from] hypr_file::Error),
    #[error(transparent)]
    ShellError(#[from] tauri_plugin_shell::Error),
    #[error(transparent)]
    TauriError(#[from] tauri::Error),
    #[error(transparent)]
    IoError(#[from] std::io::Error),
    #[error(transparent)]
    StoreError(#[from] tauri_plugin_store2::Error),
    #[error("Model not downloaded")]
    ModelNotDownloaded,
    #[error("Server already running")]
    ServerAlreadyRunning,
    #[error("Server start failed")]
    ServerStartFailed,
    #[error("AM binary not found")]
    AmBinaryNotFound,
    #[error("AM API key not set")]
    AmApiKeyNotSet,
    #[error("Internal server only supports Whisper models")]
    UnsupportedModelType,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
