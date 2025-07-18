#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("No input device found")]
    NoInputDevice,
    #[error(transparent)]
    DefaultStreamConfigError(#[from] cpal::DefaultStreamConfigError),
}
