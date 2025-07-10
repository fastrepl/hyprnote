use serde::{Deserialize, Serialize};
use tauri_plugin_store2::ScopedStoreKey;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Database error: {0}")]
    Database(#[from] hypr_db_user::Error),
    #[error("Store error: {0}")]
    Store(#[from] tauri_plugin_store2::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Detection error: {0}")]
    Detection(#[from] anyhow::Error),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, specta::Type)]
pub enum StoreKey {
    AutoRecordingEnabled,
    AutoRecordOnScheduled,
    AutoRecordOnAdHoc,
    NotifyBeforeMeeting,
    RequireWindowFocus,
    MinutesBeforeNotification,
    AutoStopOnMeetingEnd,
    DetectionConfidenceThreshold,
}

impl std::fmt::Display for StoreKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StoreKey::AutoRecordingEnabled => write!(f, "auto_recording_enabled"),
            StoreKey::AutoRecordOnScheduled => write!(f, "auto_record_on_scheduled"),
            StoreKey::AutoRecordOnAdHoc => write!(f, "auto_record_on_ad_hoc"),
            StoreKey::NotifyBeforeMeeting => write!(f, "notify_before_meeting"),
            StoreKey::RequireWindowFocus => write!(f, "require_window_focus"),
            StoreKey::MinutesBeforeNotification => write!(f, "minutes_before_notification"),
            StoreKey::AutoStopOnMeetingEnd => write!(f, "auto_stop_on_meeting_end"),
            StoreKey::DetectionConfidenceThreshold => write!(f, "detection_confidence_threshold"),
        }
    }
}

impl ScopedStoreKey for StoreKey {}
