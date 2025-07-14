const COMMANDS: &[&str] = &[
    "set_api_key",
    "set_base_url",
    "get_api_key",
    "get_base_url",
    "get_vault_name",
    "set_vault_name",
    "get_enabled",
    "set_enabled",
    "get_deep_link_url",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
