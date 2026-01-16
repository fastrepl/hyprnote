use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct HealthState {
    inner: Arc<RwLock<HealthStateInner>>,
}

struct HealthStateInner {
    llm: ComponentHealth,
    stt: ComponentHealth,
    process_start: Instant,
}

#[derive(Clone, Debug)]
pub struct ComponentHealth {
    pub last_success: Option<Instant>,
    pub last_error: Option<ErrorEvent>,
    stats: RollingStats,
}

#[derive(Clone, Debug)]
pub struct ErrorEvent {
    pub timestamp: Instant,
    pub error_type: ErrorType,
    pub message: String,
    pub provider: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ErrorType {
    RateLimited,
    PaymentRequired,
    Unauthorized,
    NotFound,
    BadRequest,
    ServerError,
    ConnectionError,
    Other,
}

impl ErrorType {
    pub fn display(&self) -> &'static str {
        match self {
            ErrorType::RateLimited => "rate_limited",
            ErrorType::PaymentRequired => "payment_required",
            ErrorType::Unauthorized => "unauthorized",
            ErrorType::NotFound => "not_found",
            ErrorType::BadRequest => "bad_request",
            ErrorType::ServerError => "server_error",
            ErrorType::ConnectionError => "connection_error",
            ErrorType::Other => "other",
        }
    }
}

#[derive(Clone, Debug)]
struct RollingStats {
    window: Duration,
    events: Vec<StatEvent>,
}

#[derive(Clone, Debug)]
struct StatEvent {
    timestamp: Instant,
    success: bool,
}

impl HealthState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(HealthStateInner {
                llm: ComponentHealth::new(),
                stt: ComponentHealth::new(),
                process_start: Instant::now(),
            })),
        }
    }

    pub fn record_llm_success(&self) {
        let mut state = self.inner.write().unwrap();
        state.llm.record_success();
    }

    pub fn record_llm_error(&self, error: ErrorEvent) {
        let mut state = self.inner.write().unwrap();
        state.llm.record_error(error);
    }

    pub fn record_stt_success(&self) {
        let mut state = self.inner.write().unwrap();
        state.stt.record_success();
    }

    pub fn record_stt_error(&self, error: ErrorEvent) {
        let mut state = self.inner.write().unwrap();
        state.stt.record_error(error);
    }

    pub fn get_snapshot(&self) -> HealthSnapshot {
        let state = self.inner.read().unwrap();
        HealthSnapshot {
            llm: state.llm.clone(),
            stt: state.stt.clone(),
            uptime: state.process_start.elapsed(),
        }
    }
}

impl Default for HealthState {
    fn default() -> Self {
        Self::new()
    }
}

impl ComponentHealth {
    fn new() -> Self {
        Self {
            last_success: None,
            last_error: None,
            stats: RollingStats::new(Duration::from_secs(300)),
        }
    }

    #[cfg(test)]
    pub fn new_for_test() -> Self {
        Self::new()
    }

    fn record_success(&mut self) {
        self.last_success = Some(Instant::now());
        self.stats.record_success();
    }

    fn record_error(&mut self, error: ErrorEvent) {
        self.last_error = Some(error);
        self.stats.record_failure();
    }

    pub fn error_rate(&self) -> f64 {
        self.stats.error_rate()
    }

    pub fn time_since_success(&self) -> Option<Duration> {
        self.last_success.map(|t| t.elapsed())
    }

    pub fn total_requests(&self) -> usize {
        self.stats.total_requests()
    }
}

impl RollingStats {
    fn new(window: Duration) -> Self {
        Self {
            window,
            events: Vec::new(),
        }
    }

    fn record_success(&mut self) {
        self.prune_old();
        self.events.push(StatEvent {
            timestamp: Instant::now(),
            success: true,
        });
    }

    fn record_failure(&mut self) {
        self.prune_old();
        self.events.push(StatEvent {
            timestamp: Instant::now(),
            success: false,
        });
    }

    fn prune_old(&mut self) {
        let cutoff = Instant::now() - self.window;
        self.events.retain(|e| e.timestamp > cutoff);
    }

    fn error_rate(&self) -> f64 {
        if self.events.is_empty() {
            return 0.0;
        }
        let failures = self.events.iter().filter(|e| !e.success).count();
        failures as f64 / self.events.len() as f64
    }

    fn total_requests(&self) -> usize {
        self.events.len()
    }
}

#[derive(Clone)]
pub struct HealthSnapshot {
    pub llm: ComponentHealth,
    pub stt: ComponentHealth,
    pub uptime: Duration,
}
