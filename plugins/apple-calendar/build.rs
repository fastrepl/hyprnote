const COMMANDS: &[&str] = &[
    "open_calendar_access_settings",
    "open_contacts_access_settings",
    "calendar_access_status",
    "contacts_access_status",
    "request_calendar_access",
    "request_contacts_access",
    "sync_calendars",
    "sync_events",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
