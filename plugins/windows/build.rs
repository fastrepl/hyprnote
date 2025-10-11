const COMMANDS: &[&str] = &[
    "window_show",
    "window_destroy",
    "window_navigate",
    "window_emit_navigate",
    "window_is_exists",
    "set_fake_window_bounds",
    "remove_fake_window",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
