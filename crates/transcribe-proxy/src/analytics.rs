use std::time::Duration;

use hypr_analytics::{AnalyticsClient, AnalyticsPayload};

#[derive(Debug, Clone)]
pub struct SttEvent {
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
            self.event_best_effort(uuid::Uuid::new_v4().to_string(), payload)
                .await;
        })
    }
}
