#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("request failed: {0}")]
    Request(#[from] reqwest::Error),
    #[error("upstream error: {status} - {body}")]
    Upstream { status: u16, body: String },
    #[error("timeout")]
    Timeout,
    #[error("client disconnected")]
    ClientDisconnected,
}
