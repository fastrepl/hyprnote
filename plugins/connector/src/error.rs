use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    AuthError(#[from] tauri_plugin_auth::Error),
    #[error(transparent)]
    LocalLlmError(#[from] tauri_plugin_local_llm::Error),
    #[error(transparent)]
    LocalSttError(#[from] tauri_plugin_local_stt::Error),
    #[error(transparent)]
    Store(#[from] tauri_plugin_store2::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
