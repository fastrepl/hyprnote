const COMMANDS: &[&str] = &[
    "is_server_running",
    "is_model_downloaded",
    "is_model_downloading",
    "download_model",
    "start_server",
    "stop_server",
    "list_ollama_models",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
