const COMMANDS: &[&str] = &[
    "models_dir",
    "is_model_downloaded",
    "is_model_downloading",
    "download_model",
    "cancel_download",
    "start_server",
    "stop_server",
    "get_servers",
    "list_supported_models",
    "list_supported_languages",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
