const COMMANDS: &[&str] = &[
    "is_server_running",
    "is_model_downloaded",
    "download_model",
    "start_server",
    "stop_server",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
