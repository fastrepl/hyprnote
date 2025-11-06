use std::io;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AudioProcessingError {
    #[error(transparent)]
    Io(#[from] io::Error),
    #[error(transparent)]
    Decoder(#[from] rodio::decoder::DecoderError),
    #[error(transparent)]
    AudioUtils(#[from] hypr_audio_utils::Error),
    #[error("audio_import_unsupported_channel_count")]
    UnsupportedChannelCount { count: u16 },
    #[error("audio_import_invalid_channel_count")]
    InvalidChannelCount,
    #[error("audio_import_empty_input")]
    EmptyInput,
    #[error("audio_import_invalid_target_rate")]
    InvalidTargetSampleRate,
}

#[derive(Error, Debug)]
pub enum AudioImportError {
    #[error("{0}")]
    PathResolver(String),
    #[error(transparent)]
    Io(#[from] io::Error),
    #[error(transparent)]
    Processing(#[from] AudioProcessingError),
}
