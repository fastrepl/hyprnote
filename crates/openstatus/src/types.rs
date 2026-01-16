use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Investigating,
    Identified,
    Monitoring,
    Resolved,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStatusReportRequest {
    pub title: String,
    pub status: Status,
    pub page_id: i64,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub monitor_ids: Option<Vec<i64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatusReportRequest {
    pub status_report_id: i64,
    pub status: Status,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusReport {
    pub id: i64,
    pub title: String,
    pub status: Status,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusReportUpdate {
    pub id: i64,
    pub status: Status,
    #[serde(default)]
    pub message: Option<String>,
}
