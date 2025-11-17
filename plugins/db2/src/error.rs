use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    PostgresError(#[from] tokio_postgres::Error),
    #[error(transparent)]
    HyprDbError(#[from] hypr_db_core::Error),
    #[error(transparent)]
    TauriError(#[from] tauri::Error),
    #[error(transparent)]
    IoError(#[from] std::io::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
