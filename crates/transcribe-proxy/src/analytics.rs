use std::time::Duration;

use hypr_analytics::{AnalyticsClient, AnalyticsPayload};

#[derive(Debug, Clone)]
pub struct SttEvent {
    pub distinct_id: Option<String>,
    pub provider: String,
    pub duration: Duration,
}

pub trait SttAnalyticsReporter: Send + Sync {
    fn report_stt(
        &self,
        event: SttEvent,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>>;
}

impl SttAnalyticsReporter for AnalyticsClient {
    fn report_stt(
        &self,
        event: SttEvent,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>> {
        Box::pin(async move {
            let payload = AnalyticsPayload::builder("$stt_request")
                .with("$stt_provider", event.provider.clone())
                .with("$stt_duration", event.duration.as_secs_f64())
                .build();
            let distinct_id = event
                .distinct_id
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
            let _ = self.event(distinct_id, payload).await;
        })
    }
}
