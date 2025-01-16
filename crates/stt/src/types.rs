#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("clova error")]
    Clova(#[from] hypr_clova::Error),
    #[error("deepgram error")]
    Deepgram(#[from] deepgram::DeepgramError),
    #[error("unknown error")]
    Unknown,
}
