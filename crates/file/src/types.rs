#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Error while uploading file: {0}")]
    UploadError(#[from] reqwest::Error),
    #[error("Error while reading file: {0}")]
    FileIOError(#[from] std::io::Error),
}
