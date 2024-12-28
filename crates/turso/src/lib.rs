use serde::{Deserialize, Serialize};
use std::fmt::Display;

pub struct TursoClient {
    client: reqwest::Client,
}

#[derive(Debug, Serialize)]
pub struct CreateDatabaseRequest {
    pub name: String,
    pub group: String,
    pub is_schema: Option<bool>,
    pub schema: Option<String>,
}

impl Default for CreateDatabaseRequest {
    fn default() -> Self {
        Self {
            name: "".to_string(),
            group: "hyprnote".to_string(),
            is_schema: None,
            schema: None,
        }
    }
}

impl CreateDatabaseRequest {
    pub fn with_name(mut self, name: impl Into<String>) -> Self {
        self.name = name.into();
        self
    }

    pub fn with_schema(mut self, schema: impl Into<String>) -> Self {
        self.is_schema = Some(true);
        self.schema = Some(schema.into());
        self
    }
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
// There can be other field along with 'database' field, which we are not interested in.
pub enum DatabaseResponse<T> {
    #[serde(rename = "error")]
    Error { error: String },
    #[serde(rename = "database")]
    Database { database: T },
}

#[derive(Debug, Deserialize)]
pub struct CreateDatabaseResponse {
    #[serde(rename = "DbId")]
    pub db_id: String,
    #[serde(rename = "Hostname")]
    pub host_name: String,
    #[serde(rename = "Name")]
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct RetrieveDatabaseResponse {
    #[serde(rename = "DbId")]
    pub db_id: String,
    #[serde(rename = "Hostname")]
    pub host_name: String,
    #[serde(rename = "Name")]
    pub name: String,
    pub block_reads: bool,
    pub block_writes: bool,
    pub allow_attach: bool,
    pub regions: Vec<String>,
    #[serde(rename = "primaryRegion")]
    pub primary_region: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub version: String,
    pub group: String,
    pub is_schema: bool,
    pub schema: Option<String>,
    pub archived: bool,
}

const ORG: &str = "yujonglee";

// https://docs.turso.tech/api-reference
impl TursoClient {
    pub fn new(api_key: impl Display) -> Self {
        let mut headers = reqwest::header::HeaderMap::new();

        let auth_str = format!("Bearer {}", api_key);
        let mut auth_value = reqwest::header::HeaderValue::from_str(&auth_str).unwrap();
        auth_value.set_sensitive(true);

        headers.insert(reqwest::header::AUTHORIZATION, auth_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        Self { client }
    }

    pub async fn create_database(
        &self,
        req: CreateDatabaseRequest,
    ) -> Result<DatabaseResponse<CreateDatabaseResponse>, reqwest::Error> {
        let url = format!(
            "https://api.turso.tech/v1/organizations/{org}/databases",
            org = ORG
        );

        let res = self
            .client
            .post(url)
            .json(&req)
            .send()
            .await?
            .json()
            .await?;

        Ok(res)
    }

    pub async fn retrieve_database(
        &self,
        db: impl Display,
    ) -> Result<DatabaseResponse<RetrieveDatabaseResponse>, reqwest::Error> {
        let url = format!(
            "https://api.turso.tech/v1/organizations/{org}/databases/{db}",
            org = ORG,
            db = db
        );

        let res = self.client.get(url).send().await?.json().await?;

        Ok(res)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // cargo test test_create_database -p turso --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_create_database() {
        let key = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJHSnhtbThWdkVlLWlnVjd1X21ISHpnIn0.I5z10kNXLf_EL0E_ezgoKi0hcoIKoCN9MgE-rfKOGjcKUfaO0YWw4UYLe9BEdV6_UVSWUUeqpa4x0UTR29p3Dg";
        let client = TursoClient::new(key);

        let req = CreateDatabaseRequest::default().with_name("test");
        let res = client.create_database(req).await;

        match res {
            Ok(DatabaseResponse::Database { database: _ }) => {
                assert!(true)
            }
            Ok(DatabaseResponse::Error { error }) => {
                assert!(false, "Error: {:?}", error);
            }
            Err(e) => {
                assert!(false, "Error: {:?}", e);
            }
        }
    }

    // cargo test test_retrieve_database -p turso --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_retrieve_database() {
        let key = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJHSnhtbThWdkVlLWlnVjd1X21ISHpnIn0.I5z10kNXLf_EL0E_ezgoKi0hcoIKoCN9MgE-rfKOGjcKUfaO0YWw4UYLe9BEdV6_UVSWUUeqpa4x0UTR29p3Dg";
        let client = TursoClient::new(key);

        let res = client.retrieve_database("test").await;

        match res {
            Ok(DatabaseResponse::Database { database: _ }) => {
                assert!(true)
            }
            Ok(DatabaseResponse::Error { error }) => {
                assert!(false, "Error: {:?}", error);
            }
            Err(e) => {
                assert!(false, "Error: {:?}", e);
            }
        }
    }
}
