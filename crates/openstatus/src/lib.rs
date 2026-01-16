mod error;
pub use error::*;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StatusReportStatus {
    Investigating,
    Identified,
    Monitoring,
    Resolved,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusReport {
    pub id: i64,
    pub title: String,
    pub status: StatusReportStatus,
    #[serde(default)]
    pub status_report_update_ids: Option<Vec<i64>>,
    #[serde(default)]
    pub monitor_ids: Vec<i64>,
    pub page_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusReportUpdate {
    #[serde(default)]
    pub id: Option<String>,
    pub status: StatusReportStatus,
    #[serde(default)]
    pub date: Option<String>,
    pub message: String,
    pub status_report_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Incident {
    pub id: i64,
    pub started_at: Option<String>,
    pub monitor_id: Option<i64>,
    pub acknowledged_at: Option<String>,
    pub acknowledged_by: Option<i64>,
    pub resolved_at: Option<String>,
    pub resolved_by: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStatusReportRequest {
    pub title: String,
    pub status: StatusReportStatus,
    pub page_id: i64,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub monitor_ids: Option<Vec<i64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStatusReportUpdateRequest {
    pub status: StatusReportStatus,
    pub message: String,
    pub status_report_id: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIncidentRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acknowledged_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ApiErrorResponse {
    code: String,
    message: String,
}

#[derive(Default)]
pub struct OpenStatusClientBuilder {
    api_key: Option<String>,
    api_base: Option<String>,
}

impl OpenStatusClientBuilder {
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn build(self) -> OpenStatusClient {
        let mut headers = reqwest::header::HeaderMap::new();

        let api_key = self.api_key.expect("api_key is required");
        let mut key_value = reqwest::header::HeaderValue::from_str(&api_key).unwrap();
        key_value.set_sensitive(true);
        headers.insert("x-openstatus-key", key_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        let api_base = self
            .api_base
            .unwrap_or_else(|| "https://api.openstatus.dev/v1".to_string());

        OpenStatusClient {
            client,
            api_base: api_base.parse().unwrap(),
        }
    }
}

#[derive(Clone)]
pub struct OpenStatusClient {
    client: reqwest::Client,
    api_base: url::Url,
}

impl OpenStatusClient {
    pub fn builder() -> OpenStatusClientBuilder {
        OpenStatusClientBuilder::default()
    }

    pub async fn list_incidents(&self) -> Result<Vec<Incident>, Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("{}/incident", self.api_base.path()));

        let response = self.client.get(url).send().await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            let error: ApiErrorResponse = response.json().await?;
            Err(Error::ListIncidentsError(error.message))
        }
    }

    pub async fn get_incident(&self, id: i64) -> Result<Incident, Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("{}/incident/{}", self.api_base.path(), id));

        let response = self.client.get(url).send().await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            let error: ApiErrorResponse = response.json().await?;
            Err(Error::GetIncidentError(error.message))
        }
    }

    pub async fn update_incident(
        &self,
        id: i64,
        req: UpdateIncidentRequest,
    ) -> Result<Incident, Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("{}/incident/{}", self.api_base.path(), id));

        let response = self.client.put(url).json(&req).send().await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            let error: ApiErrorResponse = response.json().await?;
            Err(Error::UpdateIncidentError(error.message))
        }
    }

    pub async fn acknowledge_incident(
        &self,
        id: i64,
        at: impl Into<String>,
    ) -> Result<Incident, Error> {
        self.update_incident(
            id,
            UpdateIncidentRequest {
                acknowledged_at: Some(at.into()),
                resolved_at: None,
            },
        )
        .await
    }

    pub async fn resolve_incident(
        &self,
        id: i64,
        at: impl Into<String>,
    ) -> Result<Incident, Error> {
        self.update_incident(
            id,
            UpdateIncidentRequest {
                acknowledged_at: None,
                resolved_at: Some(at.into()),
            },
        )
        .await
    }

    pub async fn list_status_reports(&self) -> Result<Vec<StatusReport>, Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("{}/status_report", self.api_base.path()));

        let response = self.client.get(url).send().await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            let error: ApiErrorResponse = response.json().await?;
            Err(Error::ListStatusReportsError(error.message))
        }
    }

    pub async fn get_status_report(&self, id: i64) -> Result<StatusReport, Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("{}/status_report/{}", self.api_base.path(), id));

        let response = self.client.get(url).send().await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            let error: ApiErrorResponse = response.json().await?;
            Err(Error::GetStatusReportError(error.message))
        }
    }

    pub async fn create_status_report(
        &self,
        req: CreateStatusReportRequest,
    ) -> Result<StatusReport, Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("{}/status_report", self.api_base.path()));

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            let error: ApiErrorResponse = response.json().await?;
            Err(Error::CreateStatusReportError(error.message))
        }
    }

    pub async fn delete_status_report(&self, id: i64) -> Result<(), Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("{}/status_report/{}", self.api_base.path(), id));

        let response = self.client.delete(url).send().await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error: ApiErrorResponse = response.json().await?;
            Err(Error::DeleteStatusReportError(error.message))
        }
    }

    pub async fn create_status_report_update(
        &self,
        req: CreateStatusReportUpdateRequest,
    ) -> Result<StatusReportUpdate, Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("{}/status_report_update", self.api_base.path()));

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            let error: ApiErrorResponse = response.json().await?;
            Err(Error::CreateStatusReportUpdateError(error.message))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_client() -> OpenStatusClient {
        OpenStatusClient::builder()
            .api_key(std::env::var("OPENSTATUS_API_KEY").unwrap_or_else(|_| "test-key".to_string()))
            .build()
    }

    #[test]
    fn test_client_builder() {
        let client = OpenStatusClient::builder()
            .api_key("test-api-key")
            .api_base("https://custom.api.com/v1")
            .build();

        assert_eq!(client.api_base.as_str(), "https://custom.api.com/v1");
    }

    #[test]
    fn test_status_report_status_serialization() {
        let status = StatusReportStatus::Investigating;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"investigating\"");

        let status: StatusReportStatus = serde_json::from_str("\"resolved\"").unwrap();
        assert_eq!(status, StatusReportStatus::Resolved);
    }

    #[test]
    fn test_create_status_report_request_serialization() {
        let req = CreateStatusReportRequest {
            title: "Test Report".to_string(),
            status: StatusReportStatus::Investigating,
            page_id: 123,
            message: "We are investigating an issue".to_string(),
            monitor_ids: Some(vec![1, 2, 3]),
            date: None,
        };

        let json = serde_json::to_value(&req).unwrap();
        assert_eq!(json["title"], "Test Report");
        assert_eq!(json["status"], "investigating");
        assert_eq!(json["pageId"], 123);
        assert_eq!(json["message"], "We are investigating an issue");
        assert_eq!(json["monitorIds"], serde_json::json!([1, 2, 3]));
        assert!(json.get("date").is_none());
    }

    #[ignore]
    #[tokio::test]
    async fn test_list_incidents() {
        let client = get_client();
        let result = client.list_incidents().await;
        println!("incidents: {:?}", result);
    }

    #[ignore]
    #[tokio::test]
    async fn test_list_status_reports() {
        let client = get_client();
        let result = client.list_status_reports().await;
        println!("status_reports: {:?}", result);
    }
}
