const COMMANDS: &[&str] = &[
    "window_show",
    "window_position",
    "window_get_floating",
    "window_set_floating",
    "window_navigate",
    "window_emit_navigate",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
