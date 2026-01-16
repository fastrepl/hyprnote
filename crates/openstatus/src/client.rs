use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use reqwest::Client;
use tokio::sync::RwLock;

use crate::error::OpenStatusError;
use crate::types::{
    CreateStatusReportRequest, Status, StatusReport, StatusReportUpdate, UpdateStatusReportRequest,
};

const BASE_URL: &str = "https://api.openstatus.dev/v1";
const COOLDOWN_DURATION: Duration = Duration::from_secs(600);

#[derive(Debug, Clone)]
struct ActiveReport {
    report_id: i64,
    created_at: Instant,
}

#[derive(Clone)]
pub struct OpenStatusClient {
    client: Client,
    api_key: String,
    page_id: i64,
    active_reports: Arc<RwLock<HashMap<String, ActiveReport>>>,
}

impl OpenStatusClient {
    pub fn new(api_key: impl Into<String>, page_id: i64) -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .expect("failed to create HTTP client"),
            api_key: api_key.into(),
            page_id,
            active_reports: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn from_env() -> Result<Self, OpenStatusError> {
        let api_key = std::env::var("OPENSTATUS_API_KEY")
            .map_err(|_| OpenStatusError::MissingConfig("OPENSTATUS_API_KEY".to_string()))?;
        let page_id = std::env::var("OPENSTATUS_PAGE_ID")
            .map_err(|_| OpenStatusError::MissingConfig("OPENSTATUS_PAGE_ID".to_string()))?
            .parse::<i64>()
            .map_err(|_| {
                OpenStatusError::MissingConfig("OPENSTATUS_PAGE_ID must be a number".to_string())
            })?;

        Ok(Self::new(api_key, page_id))
    }

    pub async fn report_error(
        &self,
        error_type: &str,
        title: &str,
        message: &str,
        monitor_id: Option<i64>,
    ) -> Result<i64, OpenStatusError> {
        let cache_key = error_type.to_string();

        {
            let reports = self.active_reports.read().await;
            if let Some(report) = reports.get(&cache_key) {
                if report.created_at.elapsed() < COOLDOWN_DURATION {
                    tracing::debug!(
                        error_type = %error_type,
                        report_id = %report.report_id,
                        "skipping_duplicate_report"
                    );
                    return Ok(report.report_id);
                }
            }
        }

        let request = CreateStatusReportRequest {
            title: title.to_string(),
            status: Status::Investigating,
            page_id: self.page_id,
            message: message.to_string(),
            monitor_ids: monitor_id.map(|id| vec![id]),
            date: None,
        };

        let report = self.create_status_report(request).await?;

        {
            let mut reports = self.active_reports.write().await;
            reports.insert(
                cache_key,
                ActiveReport {
                    report_id: report.id,
                    created_at: Instant::now(),
                },
            );
        }

        tracing::info!(
            error_type = %error_type,
            report_id = %report.id,
            "openstatus_report_created"
        );

        Ok(report.id)
    }

    pub async fn resolve_error(
        &self,
        error_type: &str,
        message: &str,
    ) -> Result<(), OpenStatusError> {
        let report_id = {
            let reports = self.active_reports.read().await;
            reports.get(error_type).map(|r| r.report_id)
        };

        let Some(report_id) = report_id else {
            tracing::debug!(
                error_type = %error_type,
                "no_active_report_to_resolve"
            );
            return Ok(());
        };

        self.update_status_report(report_id, Status::Resolved, message)
            .await?;

        {
            let mut reports = self.active_reports.write().await;
            reports.remove(error_type);
        }

        tracing::info!(
            error_type = %error_type,
            report_id = %report_id,
            "openstatus_report_resolved"
        );

        Ok(())
    }

    async fn create_status_report(
        &self,
        request: CreateStatusReportRequest,
    ) -> Result<StatusReport, OpenStatusError> {
        let url = format!("{}/status_report", BASE_URL);

        let response = self
            .client
            .post(&url)
            .header("x-openstatus-key", &self.api_key)
            .json(&request)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(OpenStatusError::Api {
                status: status.as_u16(),
                message: body,
            });
        }

        Ok(response.json().await?)
    }

    async fn update_status_report(
        &self,
        report_id: i64,
        status: Status,
        message: &str,
    ) -> Result<StatusReportUpdate, OpenStatusError> {
        let url = format!("{}/status_report_update", BASE_URL);

        let request = UpdateStatusReportRequest {
            status_report_id: report_id,
            status,
            message: message.to_string(),
            date: None,
        };

        let response = self
            .client
            .post(&url)
            .header("x-openstatus-key", &self.api_key)
            .json(&request)
            .send()
            .await?;

        let status_code = response.status();
        if !status_code.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(OpenStatusError::Api {
                status: status_code.as_u16(),
                message: body,
            });
        }

        Ok(response.json().await?)
    }
}
