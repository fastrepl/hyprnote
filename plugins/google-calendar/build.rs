const COMMANDS: &[&str] = &[
    "sync_calendars",
    "get_calendars",
    "sync_events",
    "sync_contacts",
    "get_contacts",
    "search_contacts",
    "revoke_access",
    "refresh_tokens",
    "get_connected_accounts",
    "add_google_account",
    "remove_google_account",
    "get_calendars_for_account",
    "get_contacts_for_account",
    "get_calendar_selections",
    "set_calendar_selected",
    "start_worker", 
    "stop_worker",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
