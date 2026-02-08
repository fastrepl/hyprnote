use hypr_nango::{NangoClient, NangoIntegration};

pub struct NangoHttpClient<'a> {
    nango: &'a NangoClient,
    connection_id: String,
}

impl<'a> NangoHttpClient<'a> {
    pub fn new(nango: &'a NangoClient, connection_id: impl Into<String>) -> Self {
        Self {
            nango,
            connection_id: connection_id.into(),
        }
    }
}

impl<'a> hypr_http::HttpClient for NangoHttpClient<'a> {
    async fn get(&self, path: &str) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let response = self
            .nango
            .for_connection(NangoIntegration::GoogleCalendar, &self.connection_id)
            .get(path)?
            .send()
            .await?;
        let bytes = response.error_for_status()?.bytes().await?;
        Ok(bytes.to_vec())
    }

    async fn post(
        &self,
        path: &str,
        body: Vec<u8>,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let json_value: serde_json::Value = serde_json::from_slice(&body)?;
        let response = self
            .nango
            .for_connection(NangoIntegration::GoogleCalendar, &self.connection_id)
            .post(path, &json_value)?
            .send()
            .await?;
        let bytes = response.error_for_status()?.bytes().await?;
        Ok(bytes.to_vec())
    }

    async fn put(
        &self,
        path: &str,
        body: Vec<u8>,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let json_value: serde_json::Value = serde_json::from_slice(&body)?;
        let response = self
            .nango
            .for_connection(NangoIntegration::GoogleCalendar, &self.connection_id)
            .put(path, &json_value)?
            .send()
            .await?;
        let bytes = response.error_for_status()?.bytes().await?;
        Ok(bytes.to_vec())
    }

    async fn patch(
        &self,
        path: &str,
        body: Vec<u8>,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let json_value: serde_json::Value = serde_json::from_slice(&body)?;
        let response = self
            .nango
            .for_connection(NangoIntegration::GoogleCalendar, &self.connection_id)
            .patch(path, &json_value)?
            .send()
            .await?;
        let bytes = response.error_for_status()?.bytes().await?;
        Ok(bytes.to_vec())
    }

    async fn delete(
        &self,
        path: &str,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let response = self
            .nango
            .for_connection(NangoIntegration::GoogleCalendar, &self.connection_id)
            .delete(path)?
            .send()
            .await?;
        let bytes = response.error_for_status()?.bytes().await?;
        Ok(bytes.to_vec())
    }
}
