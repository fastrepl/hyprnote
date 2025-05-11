const COMMANDS: &[&str] = &[
    "window_show",
    "window_hide",
    "window_destroy",
    "window_position",
    "window_get_floating",
    "window_set_floating",
    "window_navigate",
    "window_emit_navigate",
    "window_is_visible",
    "window_resize_default",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
