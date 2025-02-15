const COMMANDS: &[&str] = &[
    "list_calendars",
    "list_participants",
    "upsert_calendar",
    "upsert_session",
    "list_templates",
    "upsert_template",
    "delete_template",
    "list_events",
    "list_sessions",
    "get_session",
    "set_session_event",
    "get_config",
    "set_config",
    "get_self_human",
    "upsert_human",
    "get_self_organization",
    "upsert_organization",
    "list_chat_groups",
    "list_chat_messages",
    "create_chat_group",
    "upsert_chat_message",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
