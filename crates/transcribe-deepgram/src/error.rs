#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    DeepgramError(#[from] deepgram::DeepgramError),
}
