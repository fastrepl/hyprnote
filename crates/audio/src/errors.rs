#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("no input device found")]
    NoInputDevice,

    #[error("no output device found")]
    NoOutputDevice,

    #[error("audio stream initialization failed")]
    StreamInitFailed,

    #[error("permission denied for audio access")]
    PermissionDenied,

    #[error("failed to enumerate audio devices")]
    DeviceEnumerationFailed,

    #[error("audio system error: {0}")]
    AudioSystem(String),

    #[error("{0}")]
    Generic(String),
}
