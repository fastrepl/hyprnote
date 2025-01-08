// https://docs.nango.dev/host/cloud#cloud-vs-self-hosting

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// https://docs.nango.dev/understand/concepts/integrations
#[derive(Clone, Hash, Eq, PartialEq)]
pub enum NangoIntegration {
    GoogleCalendar,
}

#[derive(Clone)]
pub struct NangoClientBuilder {
    api_key: Option<String>,
    integrations: Option<HashMap<NangoIntegration, String>>,
}

#[derive(Clone)]
pub struct NangoClient {
    client: reqwest::Client,
    api_base: String,
    integrations: HashMap<NangoIntegration, String>,
}

#[derive(Serialize, Deserialize)]
pub struct NangoConnectSessionRequest {
    pub end_user: NangoConnectSessionRequestUser,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization: Option<NangoConnectSessionRequestOrganization>,
    pub allowed_integrations: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct NangoConnectSessionRequestUser {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct NangoConnectSessionRequestOrganization {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum NangoConnectSessionResponse {
    #[serde(rename = "data")]
    Data { token: String, expires_at: String },
    #[serde(rename = "error")]
    Error { code: String, message: String },
}

impl NangoClient {
    // https://docs.nango.dev/reference/api/connect/sessions/create
    pub async fn create_connect_session(
        &self,
        req: NangoConnectSessionRequest,
    ) -> Result<NangoConnectSessionResponse, reqwest::Error> {
        let res = self
            .client
            .post(&format!("{}/connect/sessions", self.api_base))
            .json(&req)
            .send()
            .await?
            .json()
            .await?;

        Ok(res)
    }

    pub fn for_connection(
        &self,
        integration: NangoIntegration,
        connection_id: impl Into<String>,
    ) -> NangoProxyBuilder {
        NangoProxyBuilder {
            nango: self,
            integration_id: self.integrations.get(&integration).unwrap().clone(),
            connection_id: connection_id.into(),
        }
    }
}

#[derive(Clone)]
pub struct NangoProxyBuilder<'a> {
    nango: &'a NangoClient,
    integration_id: String,
    connection_id: String,
}

impl NangoClientBuilder {
    pub fn new() -> Self {
        NangoClientBuilder {
            api_key: None,
            integrations: None,
        }
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn integrations(mut self, m: HashMap<NangoIntegration, String>) -> Self {
        self.integrations = Some(m);
        self
    }

    pub fn build(self) -> NangoClient {
        let mut headers = reqwest::header::HeaderMap::new();

        // https://docs.nango.dev/reference/api/authentication
        let auth_str = format!("Bearer {}", self.api_key.unwrap());
        let mut auth_value = reqwest::header::HeaderValue::from_str(&auth_str).unwrap();
        auth_value.set_sensitive(true);

        headers.insert(reqwest::header::AUTHORIZATION, auth_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        NangoClient {
            client,
            api_base: "https://api.nango.dev".to_string(),
            integrations: self.integrations.unwrap(),
        }
    }
}

impl<'a> NangoProxyBuilder<'a> {
    // https://docs.nango.dev/reference/api/proxy/get
    pub fn get(&self, url: impl std::fmt::Display) -> reqwest::RequestBuilder {
        let url = format!("{}/proxy/{}", self.nango.api_base, url);

        self.nango
            .client
            .get(url)
            .header("Connection-Id", &self.connection_id)
            .header("Provider-Config-Key", &self.integration_id)
    }

    // https://docs.nango.dev/reference/api/proxy/post
    pub fn post<T: Serialize + ?Sized>(
        &self,
        url: impl std::fmt::Display,
        data: &T,
    ) -> reqwest::RequestBuilder {
        let url = format!("{}/proxy/{}", self.nango.api_base, url);

        self.nango
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .header("Connection-Id", &self.connection_id)
            .header("Provider-Config-Key", &self.integration_id)
            .json(data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_non_proxy() {
        let nango_client = NangoClientBuilder::new()
            .api_key("api_key")
            .integrations(HashMap::from([(
                NangoIntegration::GoogleCalendar,
                String::from("some_key"),
            )]))
            .build();

        let _ = nango_client
            .create_connect_session(NangoConnectSessionRequest {
                end_user: NangoConnectSessionRequestUser {
                    id: "id".to_string(),
                    display_name: None,
                    email: None,
                },
                organization: None,
                allowed_integrations: vec![],
            })
            .await
            .unwrap();
    }

    #[test]
    fn test_proxy() {
        let nango_client = NangoClientBuilder::new()
            .api_key("api_key")
            .integrations(HashMap::from([(
                NangoIntegration::GoogleCalendar,
                String::from("some_key"),
            )]))
            .build();

        let _ = nango_client
            .for_connection(NangoIntegration::GoogleCalendar, "connection")
            .get("/users");
    }
}
