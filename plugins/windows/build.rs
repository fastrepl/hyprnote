const COMMANDS: &[&str] = &[
    "window_show",
    "window_destroy",
    "window_navigate",
    "window_emit_navigate",
    "window_is_exists",
    "set_fake_window_bounds",
    "remove_fake_window",
    "tile_with_external_window",
    "move_external_window",
    "get_focused_window_info",
    "check_window_move_permissions",
    "request_window_move_permissions",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
