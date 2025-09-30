#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Google API error: {0}")]
    GoogleApi(String),
    
    #[error("Authentication error: {0}")]
    Auth(String),
    
    #[error("OAuth error: {0}")]
    OAuth(String),
    
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    
    #[error("JSON parsing error: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("Database error: {0}")]
    Database(String),
    
    #[error("Store error: {0}")]
    Store(#[from] tauri_plugin_store::Error),
    
    #[error("Invalid token: {0}")]
    InvalidToken(String),
    
    #[error("Token expired")]
    TokenExpired,
    
    #[error("Permission denied")]
    PermissionDenied,
}

pub type Result<T> = std::result::Result<T, Error>;

impl From<String> for Error {
    fn from(s: String) -> Self {
        Error::GoogleApi(s)
    }
}

impl From<&str> for Error {
    fn from(s: &str) -> Self {
        Error::GoogleApi(s.to_string())
    }
}
