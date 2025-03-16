// https://learn.microsoft.com/en-us/graph/api/user-list-calendars

// TODO
// use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarListResponse {
    #[serde(rename = "@odata.context")]
    pub odata_context: Option<String>,
    pub value: Vec<CalendarData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarData {
    #[serde(rename = "@odata.id")]
    pub odata_id: Option<String>,
    pub id: String,
    pub name: String,
    pub color: String,
    pub change_key: String,
    pub can_share: Option<bool>,
    pub can_view_private_items: Option<bool>,
    pub hex_color: Option<String>,
    pub can_edit: Option<bool>,
    pub allowed_online_meeting_providers: Option<Vec<String>>,
    pub default_online_meeting_provider: Option<String>,
    pub is_tallying_responses: Option<bool>,
    pub is_removable: Option<bool>,
    pub owner: Owner,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Owner {
    pub name: String,
    pub address: String,
}
