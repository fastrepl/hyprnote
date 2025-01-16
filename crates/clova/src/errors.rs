#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("unknown error")]
    Connect(#[from] tonic::transport::Error),
    #[error("unknown error")]
    Unknown,
}
