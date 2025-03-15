// https://learn.microsoft.com/en-us/graph/delta-query-events?tabs=http#sample-initial-response

// TODO
// use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventDeltaResponse {
    #[serde(rename = "@odata.context")]
    pub odata_context: Option<String>,
    #[serde(rename = "@odata.nextLink")]
    pub odata_next_link: Option<String>,
    #[serde(rename = "@odata.deltaLink")]
    pub odata_delta_link: Option<String>,
    pub value: Vec<EventDelta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventDelta {
    #[serde(rename = "@odata.type")]
    pub odata_type: Option<String>,
    #[serde(rename = "@odata.etag")]
    pub odata_etag: Option<String>,
    pub subject: Option<String>,
    pub body: Option<Body>,
    pub start: Option<Timestamp>,
    pub end: Option<Timestamp>,
    pub location: Option<serde_json::Value>,
    pub attendees: Option<Vec<Attendee>>,
    pub organizer: Option<Organizer>,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Body {
    pub content: String,
    pub content_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Timestamp {
    pub date_time: String,
    pub time_zone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Attendee {
    pub email_address: EmailAddress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Organizer {
    pub email_address: EmailAddress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailAddress {
    pub name: String,
    pub address: String,
}
