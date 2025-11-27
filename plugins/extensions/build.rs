const COMMANDS: &[&str] = &[
    "load_extension",
    "call_function",
    "execute_code",
    "list_extensions",
    "get_extensions_dir",
    "get_extension",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
