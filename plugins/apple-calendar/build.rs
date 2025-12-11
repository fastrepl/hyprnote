const COMMANDS: &[&str] = &[
    "open_calendar",
    "open_calendar_access_settings",
    "open_contacts_access_settings",
    "calendar_access_status",
    "contacts_access_status",
    "has_calendar_access",
    "has_contacts_access",
    "request_calendar_access",
    "request_contacts_access",
    "revoke_calendar_access",
    "revoke_contacts_access",
    "list_calendars",
    "list_events",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
