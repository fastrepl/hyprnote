use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum NotificationError {
    #[error("Channel closed unexpectedly")]
    ChannelClosed,

    #[error("Timeout waiting for notification permission response")]
    PermissionTimeout,
}

impl Serialize for NotificationError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
