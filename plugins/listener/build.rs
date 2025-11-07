const COMMANDS: &[&str] = &[
    "list_microphone_devices",
    "get_current_microphone_device",
    "set_microphone_device",
    "get_mic_muted",
    "set_mic_muted",
    "start_session",
    "stop_session",
    "get_state",
    "run_batch",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
