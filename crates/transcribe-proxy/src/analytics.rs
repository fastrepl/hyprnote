//! Analytics reporting for STT (Speech-to-Text) events
//!
//! This module provides a trait-based abstraction for reporting analytics events
//! related to transcription requests.

use std::time::Duration;

use hypr_analytics::{AnalyticsClient, AnalyticsPayload};

/// Event data for a completed STT transcription request
#[derive(Debug, Clone)]
pub struct SttEvent {
    /// Device fingerprint for anonymous tracking
    pub fingerprint: Option<String>,
    /// Authenticated user ID
    pub user_id: Option<String>,
    /// STT provider used (e.g., "deepgram", "soniox")
    pub provider: String,
    /// Duration of the transcription session
    pub duration: Duration,
}

/// Trait for reporting STT analytics events
///
/// Implementations should handle event reporting asynchronously and not block.
pub trait SttAnalyticsReporter: Send + Sync {
    /// Report an STT event asynchronously
    ///
    /// # Arguments
    ///
    /// * `event` - The STT event data to report
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
                .with("$stt_duration", event.duration.as_secs_f64());

            let payload = if let Some(user_id) = &event.user_id {
                payload.with("user_id", user_id.clone())
            } else {
                payload
            };

            let distinct_id = event.fingerprint.unwrap_or_else(|| {
                let fallback_id = uuid::Uuid::new_v4().to_string();
                tracing::warn!(
                    fallback_id = %fallback_id,
                    provider = %event.provider,
                    "device_fingerprint missing, falling back to random UUID for distinct_id"
                );
                fallback_id
            });
            let _ = self.event(distinct_id, payload.build()).await;
        })
    }
}
