const COMMANDS: &[&str] = &[
    "models_dir",
    "list_ggml_backends",
    "is_model_downloaded",
    "is_model_downloading",
    "download_model",
    "get_current_model",
    "set_current_model",
    "list_supported_models",
    "get_server",
    "start_server",
    "stop_server",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
