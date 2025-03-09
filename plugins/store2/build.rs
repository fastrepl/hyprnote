const COMMANDS: &[&str] = &[
    "get_str",
    "set_str",
    "get_bool",
    "set_bool",
    "get_number",
    "set_number",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
