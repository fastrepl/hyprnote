const COMMANDS: &[&str] = &[
    "save",
    "get_str",
    "set_str",
    "get_bool",
    "set_bool",
    "get_number",
    "set_number",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
