use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("granola error: {0}")]
    Granola(#[from] hypr_granola::error::Error),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("database error: {0}")]
    Database(#[from] hypr_db_user::Error),

    #[error("import source not found: {0}")]
    SourceNotFound(String),
}

pub type Result<T> = std::result::Result<T, Error>;
