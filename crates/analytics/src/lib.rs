use anyhow::Result;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Clone)]
pub struct AnalyticsClient {
    client: posthog::Client,
}

impl AnalyticsClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        let config = posthog::ClientOptions::new(
            "https://us.i.posthog.com".to_string(),
            api_key.into(),
            std::time::Duration::from_secs(10),
        );

        Self {
            client: posthog::client(config),
        }
    }

    pub async fn event(&self, payload: AnalyticsPayload) -> Result<()> {
        let mut e = posthog::Event::new(payload.event, payload.distinct_id);
        for (key, value) in payload.props {
            let _ = e.insert_prop(key, value);
        }

        let _ = self.client.capture(e).await?;
        Ok(())
    }
}

#[derive(Debug, Serialize)]
pub struct AnalyticsPayload {
    event: String,
    distinct_id: String,
    #[serde(flatten)]
    props: HashMap<String, serde_json::Value>,
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
        let client = AnalyticsClient::new("test");
        let payload = AnalyticsPayload::for_user("user_id_123")
            .event("test_event")
            .with("key1", "value1")
            .with("key2", 2)
            .build();

        let _ = client.event(payload).await;
    }
}
