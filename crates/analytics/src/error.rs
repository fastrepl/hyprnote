use serde::{ser::Serializer, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    PosthogError(#[from] posthog::Error),
    #[error(transparent)]
    ReqwestError(#[from] reqwest::Error),
    #[error("Event was queued for later delivery")]
    EventQueued,
    #[error("Queue error: {0}")]
    QueueError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
