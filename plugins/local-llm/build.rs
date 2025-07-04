const COMMANDS: &[&str] = &[
    "models_dir",
    "is_server_running",
    "is_model_downloaded",
    "is_model_downloading",
    "download_model",
    "start_server",
    "stop_server",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
