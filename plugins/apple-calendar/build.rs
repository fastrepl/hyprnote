const COMMANDS: &[&str] = &[
    "open_calendar",
    "list_calendars",
    "list_events",
    "create_event",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
