// https://docs.nango.dev/host/cloud#cloud-vs-self-hosting

macro_rules! common_derives {
    ($item:item) => {
        #[derive(
            Debug,
            PartialEq,
            Clone,
            serde::Serialize,
            serde::Deserialize,
            specta::Type,
            schemars::JsonSchema,
        )]
        $item
    };
}

// https://docs.nango.dev/understand/concepts/integrations
common_derives! {
    #[derive(strum::AsRefStr)]
    pub enum NangoIntegration {
        #[serde(rename = "google-calendar")]
        #[strum(serialize = "google-calendar")]
        GoogleCalendar,
        #[serde(rename = "outlook-calendar")]
        #[strum(serialize = "outlook-calendar")]
        OutlookCalendar,
    }
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

#[derive(Clone, Default)]
pub struct NangoClientBuilder {
    api_key: Option<String>,
    api_base: Option<String>,
}

#[derive(Clone)]
pub struct NangoClient {
    client: reqwest::Client,
    api_base: url::Url,
}

common_derives! {
    pub struct NangoConnectSessionRequest {
        pub end_user: NangoConnectSessionRequestUser,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub organization: Option<NangoConnectSessionRequestOrganization>,
        pub allowed_integrations: Vec<String>,
    }
}

common_derives! {
    pub struct NangoConnectSessionRequestUser {
        pub id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub display_name: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub email: Option<String>,
    }
}

common_derives! {
    pub struct NangoConnectSessionRequestOrganization {
        pub id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub display_name: Option<String>,
    }
}

common_derives! {
    pub enum NangoConnectSessionResponse {
        #[serde(rename = "data")]
        Ok { token: String, expires_at: String },
        #[serde(rename = "error")]
        Error { code: String },
    }
}

common_derives! {
    #[serde(untagged)]
    pub enum NangoGetConnectionResponse {
        #[serde(rename = "data")]
        Ok(NangoGetConnectionResponseData),
        #[serde(rename = "error")]
        Error { message: String },
    }
}

common_derives! {
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
}

common_derives! {
    #[serde(tag = "type")]
    pub enum NangoCredentials {
        #[serde(rename = "OAUTH2")]
        OAuth2(NangoCredentialsOAuth2),
    }
}

common_derives! {
    pub struct NangoCredentialsOAuth2 {
        pub access_token: String,
    }
}

// https://docs.nango.dev/guides/getting-started/authorize-an-api-from-your-app#save-the-connection-id-backend
common_derives! {
    pub struct NangoConnectWebhook {
        pub r#type: String,
        pub operation: String,
        #[serde(rename = "connectionId")]
        pub connection_id: String,
        #[serde(rename = "endUser")]
        pub end_user: NangoConnectWebhookEndUser,
    }
}

common_derives! {
    pub struct NangoConnectWebhookEndUser {
        #[serde(rename = "endUserId")]
        pub end_user_id: String,
        #[serde(rename = "organizationId")]
        pub organization_id: Option<String>,
    }
}

impl NangoClient {
    // https://docs.nango.dev/reference/api/connection/get
    pub async fn get_connection(
        &self,
        connection_id: impl std::fmt::Display,
    ) -> Result<NangoGetConnectionResponse, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("/connection/{}", connection_id));

        let res = self.client.get(url).send().await?.json().await?;

        Ok(res)
    }

    // https://docs.nango.dev/reference/api/connect/sessions/create
    pub async fn create_connect_session(
        &self,
        req: NangoConnectSessionRequest,
    ) -> Result<NangoConnectSessionResponse, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path("/connect/sessions");

        let res = self
            .client
            .post(url)
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

    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
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
            api_base: self.api_base.unwrap().parse().unwrap(),
        }
    }
}

impl NangoProxyBuilder<'_> {
    // https://docs.nango.dev/reference/api/proxy/get
    pub fn get(&self, path: impl std::fmt::Display) -> reqwest::RequestBuilder {
        let url = make_proxy_url(&self.nango.api_base, path);

        self.nango
            .client
            .get(url)
            .header("Connection-Id", &self.connection_id)
            .header("Provider-Config-Key", &self.integration_id)
    }

    // https://docs.nango.dev/reference/api/proxy/post
    pub fn post<T: serde::Serialize + ?Sized>(
        &self,
        path: impl std::fmt::Display,
        data: &T,
    ) -> reqwest::RequestBuilder {
        let url = make_proxy_url(&self.nango.api_base, path);

        self.nango
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .header("Connection-Id", &self.connection_id)
            .header("Provider-Config-Key", &self.integration_id)
            .json(data)
    }
}

fn make_proxy_url(base: &url::Url, path: impl std::fmt::Display) -> url::Url {
    let mut url = base.clone();
    url.path_segments_mut()
        .unwrap()
        .push("proxy")
        .extend(path.to_string().split('/').filter(|s| !s.is_empty()));
    url
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_make_proxy_url() {
        let base = "https://api.nango.dev".parse().unwrap();

        assert_eq!(
            make_proxy_url(&base, "/users").to_string(),
            "https://api.nango.dev/proxy/users"
        );
        assert_eq!(
            make_proxy_url(&base, "users/123").to_string(),
            "https://api.nango.dev/proxy/users/123"
        );

        // we don't support query params yet
        assert_eq!(
            make_proxy_url(&base, "users/123?foo=bar").to_string(),
            "https://api.nango.dev/proxy/users/123"
        );
    }

    #[tokio::test]
    async fn test_non_proxy() {
        let nango_client = NangoClientBuilder::default()
            .api_base("https://api.nango.dev")
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
        let nango_client = NangoClientBuilder::default()
            .api_base("https://api.nango.dev")
            .api_key("api_key")
            .build();

        let _ = nango_client
            .for_connection(NangoIntegration::GoogleCalendar, "connection")
            .get("/users");
    }
}
