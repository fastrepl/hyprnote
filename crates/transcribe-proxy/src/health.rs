use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct SttHealth {
    inner: Arc<RwLock<HealthData>>,
}

struct HealthData {
    last_success: Option<Instant>,
    last_error: Option<ErrorEvent>,
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

impl SttHealth {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(HealthData {
                last_success: None,
                last_error: None,
                stats: RollingStats::new(Duration::from_secs(300)),
            })),
        }
    }

    pub fn record_success(&self) {
        let mut data = self.inner.write().unwrap();
        data.last_success = Some(Instant::now());

        // Clear last_error on success if it was a blocking error type
        // This fixes the bug where blocking errors cause permanent health failure
        if let Some(ref error) = data.last_error {
            if Self::is_blocking_error(&error.error_type) {
                data.last_error = None;
            }
        }

        data.stats.record_success();
    }

    pub fn record_error(&self, status_code: u16, message: String, provider: Option<String>) {
        let error_type = Self::classify_status_code(status_code);
        let mut data = self.inner.write().unwrap();
        data.last_error = Some(ErrorEvent {
            timestamp: Instant::now(),
            error_type,
            message,
            provider,
        });
        data.stats.record_failure();
    }

    pub fn snapshot(&self) -> HealthSnapshot {
        let data = self.inner.read().unwrap();
        HealthSnapshot {
            last_success: data.last_success,
            last_error: data.last_error.clone(),
            error_rate: data.stats.error_rate(),
            total_requests: data.stats.total_requests(),
        }
    }

    fn classify_status_code(code: u16) -> ErrorType {
        match code {
            400 => ErrorType::BadRequest,
            401 | 403 => ErrorType::Unauthorized,
            402 => ErrorType::PaymentRequired,
            404 => ErrorType::NotFound,
            429 => ErrorType::RateLimited,
            500..=599 => ErrorType::ServerError,
            _ => ErrorType::Other,
        }
    }

    fn is_blocking_error(error_type: &ErrorType) -> bool {
        matches!(
            error_type,
            ErrorType::PaymentRequired
                | ErrorType::Unauthorized
                | ErrorType::NotFound
                | ErrorType::BadRequest
        )
    }
}

impl Default for SttHealth {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone, Debug)]
pub struct HealthSnapshot {
    pub last_success: Option<Instant>,
    pub last_error: Option<ErrorEvent>,
    pub error_rate: f64,
    pub total_requests: usize,
}

impl HealthSnapshot {
    pub fn time_since_success(&self) -> Option<Duration> {
        self.last_success.map(|t| t.elapsed())
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

    // Filter events by time window during calculation to fix stale events bug
    fn error_rate(&self) -> f64 {
        let cutoff = Instant::now() - self.window;
        let valid_events: Vec<_> = self
            .events
            .iter()
            .filter(|e| e.timestamp > cutoff)
            .collect();

        if valid_events.is_empty() {
            return 0.0;
        }
        let failures = valid_events.iter().filter(|e| !e.success).count();
        failures as f64 / valid_events.len() as f64
    }

    // Filter events by time window during calculation to fix stale events bug
    fn total_requests(&self) -> usize {
        let cutoff = Instant::now() - self.window;
        self.events.iter().filter(|e| e.timestamp > cutoff).count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_record_success_clears_blocking_error() {
        let health = SttHealth::new();

        // Record a blocking error (401 Unauthorized)
        health.record_error(401, "Unauthorized".to_string(), None);
        let snapshot = health.snapshot();
        assert!(snapshot.last_error.is_some());

        // Record success - should clear the blocking error
        health.record_success();
        let snapshot = health.snapshot();
        assert!(snapshot.last_error.is_none());
    }

    #[test]
    fn test_record_success_keeps_non_blocking_error() {
        let health = SttHealth::new();

        // Record a non-blocking error (429 Rate Limited)
        health.record_error(429, "Rate limited".to_string(), None);
        let snapshot = health.snapshot();
        assert!(snapshot.last_error.is_some());

        // Record success - should keep the non-blocking error
        health.record_success();
        let snapshot = health.snapshot();
        assert!(snapshot.last_error.is_some());
    }

    #[test]
    fn test_error_rate_calculation() {
        let health = SttHealth::new();

        // Record 3 successes and 2 failures
        health.record_success();
        health.record_success();
        health.record_error(500, "Server error".to_string(), None);
        health.record_success();
        health.record_error(500, "Server error".to_string(), None);

        let snapshot = health.snapshot();
        assert_eq!(snapshot.total_requests, 5);
        assert!((snapshot.error_rate - 0.4).abs() < 0.01);
    }

    #[test]
    fn test_classify_status_codes() {
        let health = SttHealth::new();

        health.record_error(400, "Bad request".to_string(), None);
        assert_eq!(
            health.snapshot().last_error.unwrap().error_type,
            ErrorType::BadRequest
        );

        health.record_error(401, "Unauthorized".to_string(), None);
        assert_eq!(
            health.snapshot().last_error.unwrap().error_type,
            ErrorType::Unauthorized
        );

        health.record_error(402, "Payment required".to_string(), None);
        assert_eq!(
            health.snapshot().last_error.unwrap().error_type,
            ErrorType::PaymentRequired
        );

        health.record_error(429, "Rate limited".to_string(), None);
        assert_eq!(
            health.snapshot().last_error.unwrap().error_type,
            ErrorType::RateLimited
        );

        health.record_error(500, "Server error".to_string(), None);
        assert_eq!(
            health.snapshot().last_error.unwrap().error_type,
            ErrorType::ServerError
        );
    }
}
