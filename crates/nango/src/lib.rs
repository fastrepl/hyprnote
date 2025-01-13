// https://docs.nango.dev/host/cloud#cloud-vs-self-hosting

use serde::{Deserialize, Serialize};

// https://docs.nango.dev/understand/concepts/integrations
#[derive(Debug, PartialEq, Clone, Serialize, Deserialize, strum::AsRefStr, specta::Type)]
pub enum NangoIntegration {
    #[serde(rename = "google-calendar")]
    #[strum(serialize = "google-calendar")]
    GoogleCalendar,
    #[serde(rename = "outlook-calendar")]
    #[strum(serialize = "outlook-calendar")]
    OutlookCalendar,
}

impl TryFrom<String> for NangoIntegration {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        match value.as_str() {
            "google-calendar" => Ok(NangoIntegration::GoogleCalendar),
            "outlook-calendar" => Ok(NangoIntegration::OutlookCalendar),
            _ => Err(format!("Unknown integration: {}", value)),
        }
    }
}

impl From<NangoIntegration> for String {
    fn from(integration: NangoIntegration) -> Self {
        match integration {
            NangoIntegration::GoogleCalendar => "google-calendar".to_string(),
            NangoIntegration::OutlookCalendar => "outlook-calendar".to_string(),
        }
    }
}

#[derive(Clone)]
pub struct NangoClientBuilder {
    api_key: Option<String>,
}

#[derive(Clone)]
pub struct NangoClient {
    client: reqwest::Client,
    api_base: String,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct NangoConnectSessionRequest {
    pub end_user: NangoConnectSessionRequestUser,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization: Option<NangoConnectSessionRequestOrganization>,
    pub allowed_integrations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct NangoConnectSessionRequestUser {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct NangoConnectSessionRequestOrganization {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub enum NangoConnectSessionResponse {
    #[serde(rename = "data")]
    Ok { token: String, expires_at: String },
    #[serde(rename = "error")]
    Error { code: String },
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(untagged)]
pub enum NangoGetConnectionResponse {
    #[serde(rename = "data")]
    Ok(NangoGetConnectionResponseData),
    #[serde(rename = "error")]
    Error { message: String },
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct NangoGetConnectionResponseData {
    pub id: String,
    pub connection_id: String,
    pub provider_config_key: String,
    pub provider: String,
    pub created_at: String,
    pub updated_at: String,
    pub last_fetched_at: String,
    pub credentials: NangoCredentials,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type")]
pub enum NangoCredentials {
    #[serde(rename = "OAUTH2")]
    OAuth2(NangoCredentialsOAuth2),
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct NangoCredentialsOAuth2 {
    pub access_token: String,
}

// https://docs.nango.dev/guides/getting-started/authorize-an-api-from-your-app#save-the-connection-id-backend
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct NangoConnectWebhook {
    pub r#type: String,
    pub operation: String,
    #[serde(rename = "connectionId")]
    pub connection_id: String,
    #[serde(rename = "endUser")]
    pub end_user: NangoConnectWebhookEndUser,
}

#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct NangoConnectWebhookEndUser {
    #[serde(rename = "endUserId")]
    pub end_user_id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: Option<String>,
}

impl NangoClient {
    // https://docs.nango.dev/reference/api/connection/get
    pub async fn get_connection(
        &self,
        connection_id: impl std::fmt::Display,
    ) -> Result<NangoGetConnectionResponse, reqwest::Error> {
        let res = self
            .client
            .get(&format!("{}/connection/{}", self.api_base, connection_id))
            .send()
            .await?
            .json()
            .await?;

        Ok(res)
    }

    // https://docs.nango.dev/reference/api/connect/sessions/create
    pub async fn create_connect_session(
        &self,
        req: NangoConnectSessionRequest,
    ) -> Result<NangoConnectSessionResponse, reqwest::Error> {
        let res = self
            .client
            .post(&format!("{}/connect/sessions", self.api_base))
            .header("Content-Type", "application/json")
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
            integration_id: integration.into(),
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
        NangoClientBuilder { api_key: None }
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
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
            .api_key("de9c36c9-33dc-4ebf-b006-153d458583ea")
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
        let nango_client = NangoClientBuilder::new().api_key("api_key").build();

        let _ = nango_client
            .for_connection(NangoIntegration::GoogleCalendar, "connection")
            .get("/users");
    }
}
