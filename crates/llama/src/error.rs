use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    LlamaCppError(#[from] llama_cpp_2::LLamaCppError),
    #[error(transparent)]
    LlamaModelLoadError(#[from] llama_cpp_2::LlamaModelLoadError),
    #[error(transparent)]
    LlamaContextLoadError(#[from] llama_cpp_2::LlamaContextLoadError),
    #[error(transparent)]
    StringToTokenError(#[from] llama_cpp_2::StringToTokenError),
    #[error(transparent)]
    TokenToStringError(#[from] llama_cpp_2::TokenToStringError),
    #[error(transparent)]
    BatchAddError(#[from] llama_cpp_2::llama_batch::BatchAddError),
    #[error(transparent)]
    DecodeError(#[from] llama_cpp_2::DecodeError),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
