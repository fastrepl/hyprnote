use std::collections::HashMap;

mod error;
pub use error::*;

#[derive(Clone)]
pub struct AnalyticsClient {
    client: reqwest::Client,
    api_key: String,
}

impl AnalyticsClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        let client = reqwest::Client::new();

        Self {
            client,
            api_key: api_key.into(),
        }
    }

    pub async fn event(&self, payload: AnalyticsPayload) -> Result<(), Error> {
        if !hypr_network::is_online().await {
            return Ok(());
        }

        let mut e = posthog::Event::new(payload.event, payload.distinct_id);
        e.set_timestamp(chrono::Utc::now().naive_utc());

        for (key, value) in payload.props {
            let _ = e.insert_prop(key, value);
        }

        let inner_event = posthog_core::event::InnerEvent::new(e, self.api_key.clone());

        if !cfg!(debug_assertions) {
            let _ = self
                .client
                .post("https://us.i.posthog.com/i/v0/e/")
                .json(&inner_event)
                .send()
                .await?
                .error_for_status()?;
        } else {
            tracing::info!("event: {}", serde_json::to_string(&inner_event).unwrap());
        }

        Ok(())
    }

    pub async fn set_properties(&self, payload: PropertiesPayload) -> Result<(), Error> {
        if !hypr_network::is_online().await {
            return Ok(());
        }

        let mut e = posthog::Event::new("$set", &payload.distinct_id);
        e.set_timestamp(chrono::Utc::now().naive_utc());

        if !payload.set.is_empty() {
            let _ = e.insert_prop("$set", serde_json::json!(payload.set));
        }

        if !payload.set_once.is_empty() {
            let _ = e.insert_prop("$set_once", serde_json::json!(payload.set_once));
        }

        let inner_event = posthog_core::event::InnerEvent::new(e, self.api_key.clone());

        if !cfg!(debug_assertions) {
            let _ = self
                .client
                .post("https://us.i.posthog.com/i/v0/e/")
                .json(&inner_event)
                .send()
                .await?
                .error_for_status()?;
        } else {
            tracing::info!(
                "set_properties: {}",
                serde_json::to_string(&inner_event).unwrap()
            );
        }

        Ok(())
    }

    pub async fn event2(&self, user_id: impl Into<String>) -> Result<(), Error> {
        let payload = serde_json::json!({ "user_id": user_id.into() });
        if !cfg!(debug_assertions) {
            let _ = self
                .client
                .post("https://us.i.posthog.com/i/v0/e/")
                .query(&payload)
                .send()
                .await?
                .error_for_status()?;
        } else {
            tracing::info!("event2: {}", serde_json::to_string(&payload).unwrap());
        }

        Ok(())
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct AnalyticsPayload {
    event: String,
    distinct_id: String,
    #[serde(flatten)]
    pub props: HashMap<String, serde_json::Value>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PropertiesPayload {
    pub distinct_id: String,
    #[serde(default)]
    pub set: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub set_once: HashMap<String, serde_json::Value>,
}

#[derive(Clone)]
pub struct AnalyticsPayloadBuilder {
    event: Option<String>,
    distinct_id: String,
    props: HashMap<String, serde_json::Value>,
}

impl AnalyticsPayload {
    pub fn for_user(user_id: impl Into<String>) -> AnalyticsPayloadBuilder {
        AnalyticsPayloadBuilder {
            event: None,
            distinct_id: user_id.into(),
            props: HashMap::new(),
        }
    }
}

impl AnalyticsPayloadBuilder {
    pub fn event(mut self, name: impl Into<String>) -> Self {
        self.event = Some(name.into());
        self
    }

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
            distinct_id: self.distinct_id,
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
        let client = AnalyticsClient::new("");
        let payload = AnalyticsPayload::for_user("user_id_123")
            .event("test_event")
            .with("key1", "value1")
            .with("key2", 2)
            .build();

        client.event(payload).await.unwrap();
    }
}
