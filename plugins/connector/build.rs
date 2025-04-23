const COMMANDS: &[&str] = &[
    "get_custom_llm_enabled",
    "set_custom_llm_enabled",
    "get_custom_llm_connection",
    "set_custom_llm_connection",
    "get_llm_connection",
    "get_stt_connection",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
