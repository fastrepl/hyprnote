#[derive(Debug, thiserror::Error)]
pub enum AudioError {
    #[error("Failed to create output stream")]
    OutputStreamError,
    #[error("Failed to create input stream")]
    InputStreamError,
    #[error("Audio device error: {0}")]
    DeviceError(#[from] cpal::DevicesError),
    #[error("Host unavailable")]
    HostUnavailable(#[from] cpal::HostUnavailable),
    #[error("Stream error: {0}")]
    StreamError(#[from] cpal::StreamError),
    #[error("Sample format error: {0}")]
    SampleFormatError(String),
    #[error("Default config error: {0}")]
    DefaultConfigError(#[from] cpal::DefaultStreamConfigError),
    #[error("Build stream error: {0}")]
    BuildStreamError(#[from] cpal::BuildStreamError),
    #[error("Play stream error: {0}")]
    PlayStreamError(#[from] cpal::PlayStreamError),
    #[error("Device not found: {0}")]
    DeviceNotFound(String),
    #[error("Speaker error: {0}")]
    SpeakerError(#[from] anyhow::Error),
}
