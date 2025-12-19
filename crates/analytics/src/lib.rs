use std::collections::HashMap;

mod error;
pub use error::*;

#[derive(Clone)]
pub struct AnalyticsClient {
    client: reqwest::Client,
    api_key: Option<String>,
}

impl AnalyticsClient {
    pub fn new(api_key: Option<impl Into<String>>) -> Self {
        let client = reqwest::Client::new();

        Self {
            client,
            api_key: api_key.map(|k| k.into()),
        }
    }

    pub async fn event(
        &self,
        distinct_id: impl Into<String>,
        payload: AnalyticsPayload,
    ) -> Result<(), Error> {
        let mut e = posthog::Event::new(payload.event, distinct_id.into());
        e.set_timestamp(chrono::Utc::now().naive_utc());

        for (key, value) in payload.props {
            let _ = e.insert_prop(key, value);
        }

        if let Some(api_key) = &self.api_key {
            let inner_event = posthog_core::event::InnerEvent::new(e, api_key.clone());

            let _ = self
                .client
                .post("https://us.i.posthog.com/i/v0/e/")
                .json(&inner_event)
                .send()
                .await?
                .error_for_status()?;
        } else {
            let inner_event = posthog_core::event::InnerEvent::new(e, "".to_string());
            tracing::info!("event: {}", serde_json::to_string(&inner_event).unwrap());
        }

        Ok(())
    }

    pub async fn set_properties(
        &self,
        distinct_id: impl Into<String>,
        payload: PropertiesPayload,
    ) -> Result<(), Error> {
        let distinct_id = distinct_id.into();
        let mut e = posthog::Event::new("$set", &distinct_id);
        e.set_timestamp(chrono::Utc::now().naive_utc());

        if !payload.set.is_empty() {
            let _ = e.insert_prop("$set", serde_json::json!(payload.set));
        }

        if !payload.set_once.is_empty() {
            let _ = e.insert_prop("$set_once", serde_json::json!(payload.set_once));
        }

        if let Some(api_key) = &self.api_key {
            let inner_event = posthog_core::event::InnerEvent::new(e, api_key.clone());

            let _ = self
                .client
                .post("https://us.i.posthog.com/i/v0/e/")
                .json(&inner_event)
                .send()
                .await?
                .error_for_status()?;
        } else {
            let inner_event = posthog_core::event::InnerEvent::new(e, "".to_string());
            tracing::info!(
                "set_properties: {}",
                serde_json::to_string(&inner_event).unwrap()
            );
        }

        Ok(())
    }

    /// Send an analytics event, logging any errors at debug level.
    /// Use this for fire-and-forget analytics where failures should not affect the caller.
    pub async fn event_best_effort(
        &self,
        distinct_id: impl Into<String>,
        payload: AnalyticsPayload,
    ) {
        if let Err(e) = self.event(distinct_id, payload).await {
            tracing::debug!("analytics event failed: {}", e);
        }
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct AnalyticsPayload {
    pub event: String,
    #[serde(flatten)]
    pub props: HashMap<String, serde_json::Value>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PropertiesPayload {
    #[serde(default)]
    pub set: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub set_once: HashMap<String, serde_json::Value>,
}

#[derive(Clone)]
pub struct AnalyticsPayloadBuilder {
    event: Option<String>,
    props: HashMap<String, serde_json::Value>,
}

impl AnalyticsPayload {
    pub fn builder(event: impl Into<String>) -> AnalyticsPayloadBuilder {
        AnalyticsPayloadBuilder {
            event: Some(event.into()),
            props: HashMap::new(),
        }
    }
}

impl AnalyticsPayloadBuilder {
    pub fn with(mut self, key: impl Into<String>, value: impl Into<serde_json::Value>) -> Self {
        self.props.insert(key.into(), value.into());
        self
    }

    pub fn build(self) -> AnalyticsPayload {
        if self.event.is_none() {
            panic!("'Event' is not specified");
        }

        AnalyticsPayload {
            event: self.event.unwrap(),
            props: self.props,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[ignore]
    #[tokio::test]
    async fn test_analytics() {
        let client = AnalyticsClient::new(Some(""));
        let payload = AnalyticsPayload::builder("test_event")
            .with("key1", "value1")
            .with("key2", 2)
            .build();

        client.event("machine_id_123", payload).await.unwrap();
    }
}
