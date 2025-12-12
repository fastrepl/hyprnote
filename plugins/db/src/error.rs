use serde::{Serialize, ser::Serializer};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("user is None")]
    NoneUser,
    #[error("database is None")]
    NoneDatabase,
    #[error(transparent)]
    TauriError(#[from] tauri::Error),
    #[error(transparent)]
    DatabaseCoreError(#[from] hypr_db_core::Error),
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
