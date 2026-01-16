mod endpoints;
mod error_classifier;
mod policy;
mod state;

use std::sync::Arc;

pub use endpoints::health_router;
pub use error_classifier::classify_status_code;
pub use state::{ErrorEvent, HealthState};

pub struct LlmHealthAdapter {
    health_state: Arc<HealthState>,
}

impl LlmHealthAdapter {
    pub fn new(health_state: Arc<HealthState>) -> Self {
        Self { health_state }
    }
}

impl hypr_llm_proxy::HealthReporter for LlmHealthAdapter {
    fn record_success(&self) {
        self.health_state.record_llm_success();
    }

    fn record_error(&self, status_code: u16, message: String, provider: Option<String>) {
        let error_type = classify_status_code(status_code);
        self.health_state.record_llm_error(ErrorEvent {
            timestamp: std::time::Instant::now(),
            error_type,
            message,
            provider,
        });
    }
}

pub struct SttHealthAdapter {
    health_state: Arc<HealthState>,
}

impl SttHealthAdapter {
    pub fn new(health_state: Arc<HealthState>) -> Self {
        Self { health_state }
    }
}

impl hypr_transcribe_proxy::SttHealthReporter for SttHealthAdapter {
    fn record_success(&self) {
        self.health_state.record_stt_success();
    }

    fn record_error(&self, status_code: u16, message: String, provider: Option<String>) {
        let error_type = classify_status_code(status_code);
        self.health_state.record_stt_error(ErrorEvent {
            timestamp: std::time::Instant::now(),
            error_type,
            message,
            provider,
        });
    }
}
