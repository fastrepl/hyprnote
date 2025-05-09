const COMMANDS: &[&str] = &[
    "window_show",
    "window_destroy",
    "window_close",
    "window_hide",
    "window_position",
    "window_get_floating",
    "window_set_floating",
    "window_navigate",
    "window_emit_navigate",
    "window_is_visible",
    "window_set_overlay_bounds",
    "window_remove_overlay_bounds",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
