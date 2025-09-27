use std::collections::HashMap;

mod error;
pub use error::*;

#[derive(Clone)]
pub struct AnalyticsClient {}

impl AnalyticsClient {
    pub fn new(_api_key: impl Into<String>) -> Self {
        Self {}
    }

    pub async fn event(&self, _payload: AnalyticsPayload) -> Result<(), Error> {
        Ok(())
    }

    pub async fn set_properties(&self, _payload: PropertiesPayload) -> Result<(), Error> {
        Ok(())
    }

    pub async fn event2(&self, _user_id: impl Into<String>) -> Result<(), Error> {
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
