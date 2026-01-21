use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Failed to initialize denoiser: {0}")]
    InitError(String),

    #[error("Failed to process audio: {0}")]
    ProcessError(String),

    #[error("Invalid sample rate: expected {expected}, got {actual}")]
    InvalidSampleRate { expected: usize, actual: usize },

    #[error("Invalid frame size: expected {expected}, got {actual}")]
    InvalidFrameSize { expected: usize, actual: usize },
}
