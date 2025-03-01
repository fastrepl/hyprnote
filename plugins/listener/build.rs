const COMMANDS: &[&str] = &[
    "request_microphone_access",
    "request_system_audio_access",
    "open_microphone_access_settings",
    "open_system_audio_access_settings",
    "get_timeline",
    "subscribe",
    "unsubscribe",
    "start_session",
    "stop_session",
];
fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
