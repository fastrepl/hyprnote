use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    TauriError(#[from] tauri::Error),
    #[error(transparent)]
    WindowVibrancyError(#[from] window_vibrancy::Error),
    #[error("monitor not found")]
    MonitorNotFound,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
