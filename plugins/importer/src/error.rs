use crate::types::ImportSourceKind;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("granola error: {0}")]
    Granola(#[from] hypr_granola::error::Error),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("database error: {0}")]
    Database(#[from] hypr_db_core::Error),

    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("import source not available: {0:?}")]
    SourceNotFound(ImportSourceKind),

    #[error("tauri error: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("invalid data: {0}")]
    InvalidData(String),

    #[error("chrono parse error: {0}")]
    ChronoParse(#[from] chrono::ParseError),
}
