const COMMANDS: &[&str] = &[
    "check_microphone_permission",
    "request_microphone_permission",
    "check_system_audio_permission",
    "request_system_audio_permission",
    "check_accessibility_permission",
    "request_accessibility_permission",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
