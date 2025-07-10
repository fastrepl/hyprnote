use serde::{Deserialize, Serialize};
use tauri_plugin_store2::StoreKey as StoreKeyTrait;

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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, specta::Type)]
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

impl StoreKeyTrait for StoreKey {
    fn key(&self) -> &'static str {
        match self {
            StoreKey::AutoRecordingEnabled => "auto_recording_enabled",
            StoreKey::AutoRecordOnScheduled => "auto_record_on_scheduled",
            StoreKey::AutoRecordOnAdHoc => "auto_record_on_ad_hoc",
            StoreKey::NotifyBeforeMeeting => "notify_before_meeting",
            StoreKey::RequireWindowFocus => "require_window_focus",
            StoreKey::MinutesBeforeNotification => "minutes_before_notification",
            StoreKey::AutoStopOnMeetingEnd => "auto_stop_on_meeting_end",
            StoreKey::DetectionConfidenceThreshold => "detection_confidence_threshold",
        }
    }
}
