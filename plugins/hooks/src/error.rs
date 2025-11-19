use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("failed to load config: {0}")]
    ConfigLoad(String),
    #[error("failed to parse config: {0}")]
    ConfigParse(String),
    #[error("unsupported config version: {0}")]
    UnsupportedVersion(u8),
    #[error("hook execution failed: {0}")]
    HookExecution(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
