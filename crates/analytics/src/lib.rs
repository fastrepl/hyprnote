use std::collections::HashMap;
use std::time::Duration;

mod error;
pub use error::*;

#[derive(Clone)]
pub struct AnalyticsClient {
    client: reqwest::Client,
    api_key: Option<String>,
}

// LLM Generation Event Types
#[derive(Debug, Clone)]
pub struct GenerationEvent {
    pub generation_id: String,
    pub model: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub latency: f64,
    pub http_status: u16,
    pub total_cost: Option<f64>,
}

pub trait GenerationReporter: Send + Sync {
    fn report_generation(
        &self,
        event: GenerationEvent,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>>;
}

// STT Event Types
#[derive(Debug, Clone)]
pub struct SttEvent {
    pub provider: String,
    pub duration: Duration,
}

pub trait SttReporter: Send + Sync {
    fn report_stt(
        &self,
        event: SttEvent,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>>;
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
}

const OPENROUTER_URL: &str = "https://openrouter.ai/api/v1/chat/completions";

impl GenerationReporter for AnalyticsClient {
    fn report_generation(
        &self,
        event: GenerationEvent,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>> {
        Box::pin(async move {
            let payload = AnalyticsPayload::builder("$ai_generation")
                .with("$ai_provider", "openrouter")
                .with("$ai_model", event.model.clone())
                .with("$ai_input_tokens", event.input_tokens)
                .with("$ai_output_tokens", event.output_tokens)
                .with("$ai_latency", event.latency)
                .with("$ai_trace_id", event.generation_id.clone())
                .with("$ai_http_status", event.http_status)
                .with("$ai_base_url", OPENROUTER_URL);

            let payload = if let Some(cost) = event.total_cost {
                payload.with("$ai_total_cost_usd", cost)
            } else {
                payload
            };

            if let Err(e) = self.event(event.generation_id, payload.build()).await {
                tracing::debug!("analytics generation event failed: {}", e);
            }
        })
    }
}

impl SttReporter for AnalyticsClient {
    fn report_stt(
        &self,
        event: SttEvent,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>> {
        Box::pin(async move {
            let payload = AnalyticsPayload::builder("$stt_request")
                .with("$stt_provider", event.provider.clone())
                .with("$stt_duration", event.duration.as_secs_f64())
                .build();
            if let Err(e) = self.event(uuid::Uuid::new_v4().to_string(), payload).await {
                tracing::debug!("analytics stt event failed: {}", e);
            }
        })
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
