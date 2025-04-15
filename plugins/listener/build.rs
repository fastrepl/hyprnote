const COMMANDS: &[&str] = &[
    "check_microphone_access",
    "check_system_audio_access",
    "request_microphone_access",
    "request_system_audio_access",
    "open_microphone_access_settings",
    "open_system_audio_access_settings",
    "get_mic_muted",
    "set_mic_muted",
    "get_speaker_muted",
    "set_speaker_muted",
    "subscribe",
    "unsubscribe",
    "start_session",
    "stop_session",
    "pause_session",
    "resume_session",
    "get_state",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
