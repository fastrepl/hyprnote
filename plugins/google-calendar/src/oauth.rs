use crate::{Error, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use url::Url;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleOAuthConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessToken {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub token_type: String,
    pub expires_in: Option<u64>,
    pub scope: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub expires_in: u64,
    pub refresh_token: Option<String>,
    pub scope: Option<String>,
    pub token_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub error_description: Option<String>,
}

pub struct GoogleOAuthClient {
    config: GoogleOAuthConfig,
    client: reqwest::Client,
}

impl GoogleOAuthClient {
    const AUTH_URL: &'static str = "https://accounts.google.com/o/oauth2/v2/auth";
    const TOKEN_URL: &'static str = "https://oauth2.googleapis.com/token";
    
    const CALENDAR_SCOPES: &'static [&'static str] = &[
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar",
    ];
    
    const CONTACTS_SCOPES: &'static [&'static str] = &[
        "https://www.googleapis.com/auth/contacts.readonly",
    ];
    
    const USERINFO_SCOPES: &'static [&'static str] = &[
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
    ];

    pub fn new(config: GoogleOAuthConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    pub fn get_authorization_url(&self, scopes: &[&str], state: &str) -> String {
        let scope_str = scopes.join(" ");
        
        let mut url = Url::parse(Self::AUTH_URL).unwrap();
        url.query_pairs_mut()
            .append_pair("client_id", &self.config.client_id)
            .append_pair("redirect_uri", &self.config.redirect_uri)
            .append_pair("response_type", "code")
            .append_pair("scope", &scope_str)
            .append_pair("access_type", "offline")
            .append_pair("prompt", "consent")
            .append_pair("state", state);

        url.to_string()
    }

    pub fn get_combined_auth_url(&self, state: &str) -> String {
        let mut scopes = Self::CALENDAR_SCOPES.to_vec();
        scopes.extend_from_slice(Self::CONTACTS_SCOPES);
        scopes.extend_from_slice(Self::USERINFO_SCOPES); // Add userinfo scopes
        self.get_authorization_url(&scopes, state)
    }

    pub async fn exchange_code_for_token(&self, code: &str) -> Result<AccessToken> {
        let mut params = HashMap::new();
        params.insert("client_id", self.config.client_id.as_str());
        params.insert("client_secret", self.config.client_secret.as_str());
        params.insert("code", code);
        params.insert("grant_type", "authorization_code");
        params.insert("redirect_uri", self.config.redirect_uri.as_str());

        let response = self.client
            .post(Self::TOKEN_URL)
            .form(&params)
            .send()
            .await?;

        if response.status().is_success() {
            let token_response: TokenResponse = response.json().await?;
            Ok(AccessToken {
                access_token: token_response.access_token,
                refresh_token: token_response.refresh_token,
                token_type: token_response.token_type,
                expires_in: Some(token_response.expires_in),
                scope: token_response.scope,
            })
        } else {
            let error_response: ErrorResponse = response.json().await?;
            Err(Error::OAuth(format!(
                "{}: {}",
                error_response.error,
                error_response.error_description.unwrap_or_default()
            )))
        }
    }

    pub async fn refresh_token(&self, refresh_token: &str) -> Result<AccessToken> {
        let mut params = HashMap::new();
        params.insert("client_id", self.config.client_id.as_str());
        params.insert("client_secret", self.config.client_secret.as_str());
        params.insert("refresh_token", refresh_token);
        params.insert("grant_type", "refresh_token");

        let response = self.client
            .post(Self::TOKEN_URL)
            .form(&params)
            .send()
            .await?;

        if response.status().is_success() {
            let token_response: TokenResponse = response.json().await?;
            Ok(AccessToken {
                access_token: token_response.access_token,
                refresh_token: Some(refresh_token.to_string()), // Keep the original refresh token
                token_type: token_response.token_type,
                expires_in: Some(token_response.expires_in),
                scope: token_response.scope,
            })
        } else {
            let error_response: ErrorResponse = response.json().await?;
            Err(Error::OAuth(format!(
                "{}: {}",
                error_response.error,
                error_response.error_description.unwrap_or_default()
            )))
        }
    }
}
