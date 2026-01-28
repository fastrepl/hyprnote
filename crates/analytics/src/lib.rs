use std::collections::HashMap;
use std::sync::{Arc, RwLock};

mod error;
pub use error::*;

fn value_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Null => "null".to_string(),
        _ => serde_json::to_string(value).unwrap_or_default(),
    }
}

#[derive(Clone)]
pub struct AnalyticsClient {
    client: reqwest::Client,
    api_key: Option<String>,
    outlit: Option<Arc<outlit::Outlit>>,
    email: Arc<RwLock<Option<String>>>,
}

impl AnalyticsClient {
    pub fn new(
        api_key: Option<impl Into<String>>,
        outlit_key: Option<impl Into<String>>,
    ) -> Self {
        let client = reqwest::Client::new();
        let outlit = outlit_key.and_then(|k| {
            let key: String = k.into();
            if key.is_empty() {
                return None;
            }
            outlit::Outlit::builder(&key).build().ok().map(Arc::new)
        });

        Self {
            client,
            api_key: api_key.map(|k| k.into()),
            outlit,
            email: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn event(
        &self,
        distinct_id: impl Into<String>,
        payload: AnalyticsPayload,
    ) -> Result<(), Error> {
        let distinct_id = distinct_id.into();
        let mut e = posthog::Event::new(&payload.event, &distinct_id);
        e.set_timestamp(chrono::Utc::now().naive_utc());

        for (key, value) in &payload.props {
            let _ = e.insert_prop(key, value.clone());
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

        if let Some(outlit) = &self.outlit {
            let email_opt = self.email.read().unwrap().clone();
            if let Some(email_str) = email_opt {
                let mut builder = outlit
                    .track(&payload.event, outlit::email(&email_str))
                    .user_id(&distinct_id);
                for (k, v) in &payload.props {
                    builder = builder.property(k, value_to_string(v));
                }
                if let Err(e) = builder.send().await {
                    tracing::warn!("outlit track error: {:?}", e);
                }
            }
        }

        Ok(())
    }

    pub async fn set_properties(
        &self,
        distinct_id: impl Into<String>,
        payload: PropertiesPayload,
    ) -> Result<(), Error> {
        let distinct_id = distinct_id.into();

        if let Some(email) = payload.set.get("email").and_then(|v| v.as_str()) {
            *self.email.write().unwrap() = Some(email.to_string());
        }
        if payload.set.get("is_signed_up") == Some(&serde_json::json!(false)) {
            *self.email.write().unwrap() = None;
        }

        let mut e = posthog::Event::new("$set", &distinct_id);
        e.set_timestamp(chrono::Utc::now().naive_utc());

        if !payload.set.is_empty() {
            let _ = e.insert_prop("$set", serde_json::json!(payload.set));
        }

        if !payload.set_once.is_empty() {
            let _ = e.insert_prop("$set_once", serde_json::json!(payload.set_once));
        }

        if let Some(email) = &payload.email {
            let _ = e.insert_prop("$email", serde_json::json!(email));
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

        if let Some(outlit) = &self.outlit {
            let email_opt = self.email.read().unwrap().clone();
            if let Some(email_str) = email_opt {
                let mut builder = outlit
                    .identify(outlit::email(&email_str))
                    .user_id(&distinct_id);
                for (k, v) in &payload.set {
                    builder = builder.trait_(k, value_to_string(v));
                }
                if let Err(e) = builder.send().await {
                    tracing::warn!("outlit identify error: {:?}", e);
                }
            }
        }

        Ok(())
    }

    pub async fn event2(&self, user_id: impl Into<String>) -> Result<(), Error> {
        let payload = serde_json::json!({ "user_id": user_id.into() });
        if let Some(_api_key) = &self.api_key {
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
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
        let client = AnalyticsClient::new(Some(""), None::<String>);
        let payload = AnalyticsPayload::builder("test_event")
            .with("key1", "value1")
            .with("key2", 2)
            .build();

        client.event("machine_id_123", payload).await.unwrap();
    }
}
