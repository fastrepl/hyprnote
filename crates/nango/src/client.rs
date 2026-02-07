use crate::proxy::NangoProxyBuilder;
use crate::types::*;

#[derive(Clone, Default)]
pub struct NangoClientBuilder {
    api_key: Option<String>,
    api_base: Option<String>,
}

#[derive(Clone)]
pub struct NangoClient {
    pub(crate) client: reqwest::Client,
    pub(crate) api_base: url::Url,
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

    pub fn build(self) -> Result<NangoClient, crate::Error> {
        let api_key = self.api_key.ok_or(crate::Error::MissingApiKey)?;
        let api_base = self.api_base.ok_or(crate::Error::MissingApiBase)?;

        let mut headers = reqwest::header::HeaderMap::new();

        let auth_str = format!("Bearer {}", api_key);
        let mut auth_value = reqwest::header::HeaderValue::from_str(&auth_str)
            .map_err(|_| crate::Error::InvalidApiKey)?;
        auth_value.set_sensitive(true);

        headers.insert(reqwest::header::AUTHORIZATION, auth_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()?;

        Ok(NangoClient {
            client,
            api_base: api_base.parse().map_err(|_| crate::Error::InvalidApiBase)?,
        })
    }
}

impl NangoClient {
    pub async fn get_connection(
        &self,
        connection_id: impl std::fmt::Display,
    ) -> Result<NangoGetConnectionResponseData, crate::Error> {
        let mut url = self.api_base.clone();
        url.set_path(&format!("/connection/{}", connection_id));

        let res: NangoGetConnectionResponse = self.client.get(url).send().await?.json().await?;
        match res {
            NangoGetConnectionResponse::Ok(data) => Ok(*data),
            NangoGetConnectionResponse::Error { message } => Err(crate::Error::NangoError(message)),
        }
    }

    pub async fn create_connect_session(
        &self,
        req: NangoConnectSessionRequest,
    ) -> Result<NangoConnectSessionResponse, crate::Error> {
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
    ) -> NangoProxyBuilder<'_> {
        NangoProxyBuilder::new(self, integration.into(), connection_id.into())
    }
}
