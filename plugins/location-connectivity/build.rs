const COMMANDS: &[&str] = &[
    "get_current_ssid",
    "get_trusted_ssids",
    "add_trusted_ssid",
    "remove_trusted_ssid",
    "is_location_based_enabled",
    "set_location_based_enabled",
    "is_in_trusted_location",
    "get_location_status",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}