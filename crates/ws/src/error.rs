#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("unknown error")]
    Unknown,
    #[error("connection error")]
    Connection(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("timeout error")]
    Timeout(#[from] tokio::time::error::Elapsed),
    #[error("send error")]
    SendError(#[from] tokio::sync::mpsc::error::SendError<()>),
}
