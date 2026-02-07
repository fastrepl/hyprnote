use std::collections::HashMap;

use crate::common_derives;

common_derives! {
    #[derive(strum::AsRefStr, std::hash::Hash)]
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
    type Error = crate::Error;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        match value.as_str() {
            "google-calendar" => Ok(NangoIntegration::GoogleCalendar),
            "outlook-calendar" => Ok(NangoIntegration::OutlookCalendar),
            _ => Err(crate::Error::UnknownIntegration),
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

common_derives! {
    pub struct NangoConnectSessionRequest {
        pub end_user: NangoConnectSessionRequestUser,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub organization: Option<NangoConnectSessionRequestOrganization>,
        pub allowed_integrations: Vec<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub integrations_config_defaults: Option<HashMap<String, NangoConnectSessionRequestIntegrationConfig>>,
    }
}

common_derives! {
    pub struct NangoConnectSessionRequestUser {
        pub id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub display_name: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub email: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub tags: Option<HashMap<String, String>>,
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
    pub struct NangoConnectSessionRequestIntegrationConfig {
        #[serde(skip_serializing_if = "Option::is_none")]
        pub user_scopes: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub connection_config: Option<NangoConnectSessionRequestIntegrationConnectionConfig>,
    }
}

common_derives! {
    pub struct NangoConnectSessionRequestIntegrationConnectionConfig {
        pub oauth_scopes_override: String
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
        Ok(Box<NangoGetConnectionResponseData>),
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
        pub errors: Vec<serde_json::Value>,
        pub metadata: serde_json::Value,
        pub connection_config: serde_json::Value,
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
