const COMMANDS: &[&str] = &[
    "is_configured",
    "set_api_key",
    "set_base_url",
    "get_api_key",
    "get_base_url",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
