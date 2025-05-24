const COMMANDS: &[&str] = &[
    // calendar
    "get_calendar",
    "list_calendars",
    "upsert_calendar",
    "toggle_calendar_selected",
    // session
    "onboarding_session_id",
    "visit_session",
    "upsert_session",
    "list_sessions",
    "delete_session",
    "get_session",
    "set_session_event",
    "session_add_participant",
    "session_remove_participant",
    "session_list_participants",
    "session_get_event",
    "get_words_onboarding",
    "get_words",
    // template
    "list_templates",
    "upsert_template",
    "delete_template",
    // event
    "get_event",
    "list_events",
    // config
    "get_config",
    "set_config",
    // user
    "get_human",
    "upsert_human",
    "list_humans",
    "delete_human",
    "upsert_organization",
    "delete_organization",
    "get_organization",
    "get_organization_by_user_id",
    "list_organizations",
    "list_organization_members",
    // chat
    "list_chat_groups",
    "list_chat_messages",
    "create_chat_group",
    "upsert_chat_message",
    // tag
    "list_all_tags",
    "list_session_tags",
    "assign_tag_to_session",
    "unassign_tag_from_session",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
