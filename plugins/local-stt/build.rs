const COMMANDS: &[&str] = &[
    "models_dir",
    "list_ggml_backends",
    "is_model_downloaded",
    "is_model_downloading",
    "download_model",
    "start_server",
    "stop_server",
    "get_servers",
    "get_local_model",
    "set_local_model",
    "list_supported_models",
    "list_supported_languages",
    "get_custom_base_url",
    "get_custom_api_key",
    "set_custom_base_url",
    "set_custom_api_key",
    "get_provider",
    "set_provider",
    "get_custom_model",
    "set_custom_model",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
