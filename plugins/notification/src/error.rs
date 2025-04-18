use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum NotificationError {
    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error("Channel closed unexpectedly")]
    ChannelClosed,

    #[error("Timeout waiting for notification permission response")]
    PermissionTimeout,

    #[error(transparent)]
    Store(#[from] tauri_plugin_store2::Error),
}

impl Serialize for NotificationError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
