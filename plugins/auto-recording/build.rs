const COMMANDS: &[&str] = &[
    "get_auto_recording_enabled",
    "set_auto_recording_enabled",
    "get_auto_record_on_scheduled",
    "set_auto_record_on_scheduled",
    "get_auto_record_on_ad_hoc",
    "set_auto_record_on_ad_hoc",
    "get_notify_before_meeting",
    "set_notify_before_meeting",
    "get_require_window_focus",
    "set_require_window_focus",
    "get_minutes_before_notification",
    "set_minutes_before_notification",
    "get_auto_stop_on_meeting_end",
    "set_auto_stop_on_meeting_end",
    "get_detection_confidence_threshold",
    "set_detection_confidence_threshold",
    "start_auto_recording_monitor",
    "stop_auto_recording_monitor",
    "get_active_meetings",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
