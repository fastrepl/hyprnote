const COMMANDS: &[&str] = &[
    "load_extension",
    "call_function",
    "execute_code",
    "list_extensions",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
