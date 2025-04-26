#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error(transparent)]
    Language(#[from] hypr_language::Error),
    #[error(transparent)]
    Deepgram(#[from] deepgram::DeepgramError),
    #[error(transparent)]
    Clova(#[from] hypr_clova::Error),
    #[error("clova error {0}")]
    ClovaError(String),
}
