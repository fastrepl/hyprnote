use hypr_nango::NangoClient;

use crate::config::NangoConfig;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: NangoConfig,
    pub(crate) nango: NangoClient,
    pub(crate) http_client: reqwest::Client,
}

impl AppState {
    pub(crate) fn new(config: NangoConfig) -> Self {
        let mut builder = hypr_nango::NangoClient::builder().api_key(&config.nango.nango_api_key);
        if let Some(api_base) = &config.nango.nango_api_base {
            builder = builder.api_base(api_base);
        }
        let nango = builder.build().expect("failed to build NangoClient");

        Self {
            config,
            nango,
            http_client: reqwest::Client::new(),
        }
    }

    pub(crate) async fn upsert_connection(
        &self,
        user_id: &str,
        integration_id: &str,
        connection_id: &str,
        provider: &str,
    ) -> Result<(), crate::error::NangoError> {
        let service_role_key = self
            .config
            .supabase_service_role_key
            .as_deref()
            .ok_or_else(|| {
                crate::error::NangoError::Internal(
                    "supabase_service_role_key not configured".to_string(),
                )
            })?;

        let url = format!(
            "{}/rest/v1/nango_connections",
            self.config.supabase_url.trim_end_matches('/'),
        );

        let body = serde_json::json!({
            "user_id": user_id,
            "integration_id": integration_id,
            "connection_id": connection_id,
            "provider": provider,
            "updated_at": chrono::Utc::now().to_rfc3339(),
        });

        let response = self
            .http_client
            .post(&url)
            .header("Authorization", format!("Bearer {}", service_role_key))
            .header("apikey", service_role_key)
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=merge-duplicates")
            .json(&body)
            .send()
            .await
            .map_err(|e| crate::error::NangoError::Internal(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(crate::error::NangoError::Internal(format!(
                "upsert failed: {} - {}",
                status, body
            )));
        }

        Ok(())
    }

    pub(crate) async fn delete_connection(
        &self,
        user_id: &str,
        integration_id: &str,
    ) -> Result<(), crate::error::NangoError> {
        let service_role_key = self
            .config
            .supabase_service_role_key
            .as_deref()
            .ok_or_else(|| {
                crate::error::NangoError::Internal(
                    "supabase_service_role_key not configured".to_string(),
                )
            })?;

        let url = format!(
            "{}/rest/v1/nango_connections?user_id=eq.{}&integration_id=eq.{}",
            self.config.supabase_url.trim_end_matches('/'),
            user_id,
            integration_id,
        );

        let response = self
            .http_client
            .delete(&url)
            .header("Authorization", format!("Bearer {}", service_role_key))
            .header("apikey", service_role_key)
            .send()
            .await
            .map_err(|e| crate::error::NangoError::Internal(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(crate::error::NangoError::Internal(format!(
                "delete failed: {} - {}",
                status, body
            )));
        }

        Ok(())
    }
}
