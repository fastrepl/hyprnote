use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    IoError(#[from] std::io::Error),
    #[error(transparent)]
    CpalDevicesError(#[from] hypr_audio::cpal::DevicesError),
    #[error(transparent)]
    ListenClientError(#[from] hypr_ws::Error),
    #[error(transparent)]
    DatabaseError(#[from] tauri_plugin_db::Error),
    #[error("no STT connection")]
    NoSTTConnection,
    #[error("no session")]
    NoneSession,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
