use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct TursoClient {
    client: reqwest::Client,
    pub api_base: url::Url,
    pub api_key: String,
    pub org_slug: String,
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
    Ok { database: T },
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

#[derive(Debug, Deserialize)]
pub struct DeleteDatabaseResponse {
    pub database: String,
}

#[derive(Default)]
pub struct TursoClientBuilder {
    api_key: Option<String>,
    org_slug: Option<String>,
}

impl TursoClientBuilder {
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn org_slug(mut self, org_slug: impl Into<String>) -> Self {
        self.org_slug = Some(org_slug.into());
        self
    }

    pub fn build(self) -> TursoClient {
        let mut headers = reqwest::header::HeaderMap::new();

        let api_key = self.api_key.unwrap();
        let auth_str = format!("Bearer {}", &api_key);
        let mut auth_value = reqwest::header::HeaderValue::from_str(&auth_str).unwrap();
        auth_value.set_sensitive(true);

        headers.insert(reqwest::header::AUTHORIZATION, auth_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        TursoClient {
            client,
            api_base: "https://api.turso.tech".parse().unwrap(),
            api_key,
            org_slug: self.org_slug.unwrap(),
        }
    }
}

// https://docs.turso.tech/api-reference
impl TursoClient {
    pub fn builder() -> TursoClientBuilder {
        TursoClientBuilder::default()
    }

    pub fn db_url(&self, name: impl Into<String>) -> String {
        format!("libsql://{}-{}.turso.io", name.into(), self.org_slug)
    }

    // https://docs.turso.tech/api-reference/databases/create-token
    pub async fn generate_db_token(
        &self,
        db_name: impl Into<String>,
    ) -> Result<String, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!(
            "/v1/organizations/{}/databases/{}/auth/tokens",
            self.org_slug,
            db_name.into()
        ));
        url.query_pairs_mut()
            .append_pair("expiration", "never")
            .append_pair("authorization", "full-access");

        let res = self
            .client
            .post(url)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let jwt = res.get("jwt").unwrap().as_str().unwrap();
        Ok(jwt.to_string())
    }

    // https://docs.turso.tech/api-reference/databases/create
    pub async fn create_database(
        &self,
        req: CreateDatabaseRequest,
    ) -> Result<DatabaseResponse<CreateDatabaseResponse>, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("/v1/organizations/{}/databases", self.org_slug));

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

    // https://docs.turso.tech/api-reference/databases/retrieve
    pub async fn retrieve_database(
        &self,
        db: impl std::fmt::Display,
    ) -> Result<DatabaseResponse<RetrieveDatabaseResponse>, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!(
            "/v1/organizations/{}/databases/{}",
            self.org_slug, db
        ));

        let res = self.client.get(url).send().await?.json().await?;

        Ok(res)
    }

    // https://docs.turso.tech/api-reference/databases/delete
    pub async fn delete_database(
        &self,
        db: impl std::fmt::Display,
    ) -> Result<DatabaseResponse<DeleteDatabaseResponse>, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!(
            "/v1/organizations/{}/databases/{}",
            self.org_slug, db
        ));

        let res = self.client.delete(url).send().await?.json().await?;
        Ok(res)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_client() -> TursoClient {
        TursoClient::builder()
            .api_key(std::env::var("TURSO_API_KEY").unwrap())
            .org_slug("yujonglee")
            .build()
    }

    // cargo test test_generate_db_token -p turso --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_generate_db_token() {
        let client = get_client();

        let jwt = client.generate_db_token("prod-admin").await.unwrap();
        println!("jwt: {:?}", jwt);
    }

    // cargo test test_create_database -p turso --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_create_database() {
        let client = get_client();

        let req = CreateDatabaseRequestBuilder::new()
            .with_name("test")
            .build();
        let res = client.create_database(req).await;

        match res {
            Ok(DatabaseResponse::Ok { database: _ }) => {
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
        let client = get_client();

        let res = client.retrieve_database("test").await;

        match res {
            Ok(DatabaseResponse::Ok { database: _ }) => {
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
