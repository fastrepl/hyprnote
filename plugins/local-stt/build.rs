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
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    swift_rs::link_swift_framework("vad-ext");

    tauri_plugin::Builder::new(COMMANDS).build();
}
