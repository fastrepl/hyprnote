use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    OrtError(#[from] ort::Error),
    #[error(transparent)]
    ShapeError(#[from] ndarray::ShapeError),
    #[error("Invalid or missing output from model")]
    InvalidOutput,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
