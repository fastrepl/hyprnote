#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Clap(#[from] clap::Error),
}

pub type Result<T> = std::result::Result<T, Error>;
