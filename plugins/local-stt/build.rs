const COMMANDS: &[&str] = &[
    "is_server_running",
    "start_server",
    "stop_server",
    "download_model",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
