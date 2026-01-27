use serde::{Serialize, ser::Serializer};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("migration gap: cannot migrate from {from} to {to}")]
    MigrationGap {
        from: hypr_version::Version,
        to: hypr_version::Version,
    },
    #[error("import failed: {0}")]
    ImportFailed(String),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
