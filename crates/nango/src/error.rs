use serde::{Serialize, ser::Serializer};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("nango error: {0}")]
    NangoError(String),
    #[error(transparent)]
    ReqwestError(#[from] reqwest::Error),
    #[error("unknown integration")]
    UnknownIntegration,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
