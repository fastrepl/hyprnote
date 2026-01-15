#[derive(thiserror::Error)]
pub enum Error {
    #[error("unknown error")]
    Unknown,
    #[error("{}", format_connection_error(.0))]
    Connection(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("timeout error")]
    Timeout(#[from] tokio::time::error::Elapsed),
    #[error("send error")]
    SendError(#[from] tokio::sync::mpsc::error::SendError<()>),
}

fn format_connection_error(e: &tokio_tungstenite::tungstenite::Error) -> String {
    if let tokio_tungstenite::tungstenite::Error::Http(response) = e {
        let status = response.status();
        let body_str = response
            .body()
            .as_ref()
            .and_then(|b| std::str::from_utf8(b).ok())
            .unwrap_or("");
        return format!("HTTP {} - {}", status, body_str);
    }
    format!("{:?}", e)
}

impl std::fmt::Debug for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Error::Unknown => write!(f, "Unknown"),
            Error::Connection(e) => write!(f, "Connection({})", format_connection_error(e)),
            Error::Timeout(e) => write!(f, "Timeout({:?})", e),
            Error::SendError(e) => write!(f, "SendError({:?})", e),
        }
    }
}

impl Error {
    pub fn is_auth_error(&self) -> bool {
        if let Error::Connection(tungstenite_error) = self
            && let tokio_tungstenite::tungstenite::Error::Http(response) = tungstenite_error
        {
            let status = response.status().as_u16();
            return status == 401 || status == 403;
        }
        false
    }
}
