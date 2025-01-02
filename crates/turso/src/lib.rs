use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct TursoClient {
    client: reqwest::Client,
}

pub struct CreateDatabaseRequestBuilder {
    pub name: Option<String>,
    pub is_schema: Option<bool>,
    pub schema: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateDatabaseRequest {
    pub name: String,
    pub group: String,
    pub is_schema: Option<bool>,
    pub schema: Option<String>,
}

impl CreateDatabaseRequestBuilder {
    pub fn new() -> Self {
        Self {
            name: None,
            is_schema: None,
            schema: None,
        }
    }

    pub fn build(self) -> CreateDatabaseRequest {
        // `_` is invalid
        CreateDatabaseRequest {
            #[cfg(debug_assertions)]
            name: format!("dev-{}", self.name.unwrap()),
            #[cfg(not(debug_assertions))]
            name: format!("prod-{}", self.name.unwrap()),
            group: "hyprnote".to_string(),
            is_schema: self.is_schema,
            schema: self.schema,
        }
    }

    pub fn with_name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
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
// There can be other fields along with 'database' field, which we are not interested in.
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
    pub fn new(api_key: impl std::fmt::Display) -> Self {
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
        db: impl std::fmt::Display,
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
        let key = "TODO";
        let client = TursoClient::new(key);

        let req = CreateDatabaseRequestBuilder::new()
            .with_name("test")
            .build();
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
        let key = "TODO";
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
