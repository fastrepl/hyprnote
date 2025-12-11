const COMMANDS: &[&str] = &[
    "check_microphone_permission",
    "request_microphone_permission",
    "check_system_audio_permission",
    "request_system_audio_permission",
    "check_accessibility_permission",
    "request_accessibility_permission",
    "check_calendar_permission",
    "request_calendar_permission",
    "check_contacts_permission",
    "request_contacts_permission",
    "open_calendar_settings",
    "open_contacts_settings",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
