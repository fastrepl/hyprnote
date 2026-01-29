use std::sync::Arc;

use crate::{AnalyticsPayload, PropertiesPayload};

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
pub struct OutlitClient {
    inner: Arc<outlit::Outlit>,
}

impl OutlitClient {
    pub fn new(api_key: impl Into<String>) -> Option<Self> {
        let key: String = api_key.into();
        if key.is_empty() {
            return None;
        }
        outlit::Outlit::builder(&key)
            .build()
            .ok()
            .map(|inner| Self {
                inner: Arc::new(inner),
            })
    }

    pub async fn event(&self, distinct_id: &str, payload: &AnalyticsPayload) {
        let mut builder = self
            .inner
            .track_by_fingerprint(&payload.event, outlit::fingerprint(distinct_id));

        for (k, v) in &payload.props {
            builder = builder.property(k, value_to_string(v));
        }

        if let Err(e) = builder.send().await {
            tracing::warn!("outlit track error: {:?}", e);
        }
    }

    pub async fn identify(&self, distinct_id: &str, payload: &PropertiesPayload) {
        let email_str = payload
            .email
            .as_deref()
            .or_else(|| payload.set.get("email").and_then(|v| v.as_str()));

        let Some(email) = email_str else {
            return;
        };

        let mut builder = self
            .inner
            .identify(outlit::email(email))
            .fingerprint(distinct_id);

        if let Some(user_id) = &payload.user_id {
            builder = builder.user_id(user_id);
        }

        for (k, v) in &payload.set {
            builder = builder.trait_(k, value_to_string(v));
        }

        if let Err(e) = builder.send().await {
            tracing::warn!("outlit identify error: {:?}", e);
        }
    }
}
