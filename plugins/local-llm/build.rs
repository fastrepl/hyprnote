const COMMANDS: &[&str] = &[
    "models_dir",
    "is_server_running",
    "is_model_downloaded",
    "is_model_downloading",
    "download_model",
    "start_server",
    "stop_server",
    "restart_server",
    "get_current_model",
    "set_current_model",
    "list_downloaded_model",
    "list_supported_model",
    "list_custom_models",
    "get_current_model_selection",
    "set_current_model_selection",
    "generate_title",
    "generate_tags",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
