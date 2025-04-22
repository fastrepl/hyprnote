const COMMANDS: &[&str] = &[
    "get_api_base",
    "get_api_key",
    "get_custom_openai_api_base",
    "set_custom_openai_api_base",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
