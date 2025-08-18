#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    IoError(#[from] std::io::Error),

    #[error(transparent)]
    HyprFileError(#[from] hypr_file::Error),

    #[error("not supported")]
    NotSupported,

    #[error("file not found: {0}")]
    FileNotFound(std::path::PathBuf),

    #[error("file size mismatch: {0}")]
    FileSizeMismatch(std::path::PathBuf),

    #[error("file checksum mismatch: {0}")]
    FileChecksumMismatch(std::path::PathBuf),
}
