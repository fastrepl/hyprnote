use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Store(#[from] tauri_plugin_store2::Error),
    #[error(transparent)]
    Db(#[from] hypr_db_user::Error),
    #[error("Channel closed unexpectedly")]
    ChannelClosed,
    #[error("Timeout waiting for notification permission response")]
    PermissionTimeout,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

impl Error {
    pub fn as_worker_error(&self) -> apalis::prelude::Error {
        apalis::prelude::Error::Failed(std::sync::Arc::new(Box::new(std::io::Error::new(
            std::io::ErrorKind::Other,
            self.to_string(),
        ))))
    }
}
