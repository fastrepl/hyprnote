use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    IoError(#[from] std::io::Error),
    #[error(transparent)]
    HyprAudioError(#[from] hypr_audio::Error),
    #[error(transparent)]
    CpalDevicesError(#[from] hypr_audio::cpal::DevicesError),
    #[error(transparent)]
    DatabaseError(#[from] tauri_plugin_db::Error),
    #[error(transparent)]
    ConnectorError(#[from] tauri_plugin_connector::Error),
    #[error("no session")]
        NoneSession,
        #[error("missing user id")]
        MissingUserId,
        #[error("start session failed")]
        StartSessionFailed,
        #[error("stop session failed")]
        StopSessionFailed,
        #[error("pause session failed")]
        PauseSessionFailed,
        #[error("resume session failed")]
        ResumeSessionFailed,
    }

impl Serialize for Error {
    /// Serializes the error as its human-readable string representation.
    ///
    /// The error is converted with `to_string()` and that string is serialized.
    ///
    /// # Examples
    ///
    /// ```
    /// use serde_json::to_string;
    /// // construct an example error variant
    /// let err = crate::Error::NoneSession;
    /// let s = to_string(&err).unwrap();
    /// assert_eq!(s, "\"no session\"");
    /// ```
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}