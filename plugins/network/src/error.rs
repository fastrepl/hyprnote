#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Network check failed: {0}")]
    NetworkCheckFailed(String),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
