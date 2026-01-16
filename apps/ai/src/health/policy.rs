use std::time::Duration;

use serde::{Deserialize, Serialize};

use hypr_llm_proxy::health::ErrorType;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Pass,
    Warn,
    Fail,
}

#[derive(Clone)]
pub struct ComponentReadiness {
    pub status: HealthStatus,
    pub message: Option<String>,
}

enum ErrorSeverity {
    Blocking,
    Degraded,
    Transient,
}

const MIN_SAMPLE_SIZE: usize = 5;
const FAIL_ERROR_RATE: f64 = 0.5;
const WARN_ERROR_RATE: f64 = 0.2;
const RATE_LIMIT_FRESHNESS_SECS: u64 = 60;
const SERVER_ERROR_FRESHNESS_SECS: u64 = 30;

pub struct ReadinessPolicy;

impl ReadinessPolicy {
    pub fn evaluate_llm(snapshot: &hypr_llm_proxy::health::HealthSnapshot) -> ComponentReadiness {
        Self::evaluate_impl(
            snapshot
                .last_error
                .as_ref()
                .map(|e| (&e.error_type, e.timestamp.elapsed(), &e.message)),
            snapshot.total_requests,
            snapshot.error_rate,
        )
    }

    pub fn evaluate_stt(
        snapshot: &hypr_transcribe_proxy::health::HealthSnapshot,
    ) -> ComponentReadiness {
        Self::evaluate_impl(
            snapshot
                .last_error
                .as_ref()
                .map(|e| (&e.error_type, e.timestamp.elapsed(), &e.message)),
            snapshot.total_requests,
            snapshot.error_rate,
        )
    }

    fn evaluate_impl(
        last_error: Option<(&ErrorType, Duration, &String)>,
        total_requests: usize,
        error_rate: f64,
    ) -> ComponentReadiness {
        if let Some((error_type, age, message)) = last_error {
            match Self::classify_error_severity(error_type, age) {
                ErrorSeverity::Blocking => {
                    return ComponentReadiness {
                        status: HealthStatus::Fail,
                        message: Some(format!("{}: {}", error_type, message)),
                    };
                }
                ErrorSeverity::Degraded => {
                    return ComponentReadiness {
                        status: HealthStatus::Warn,
                        message: Some(format!("{}: {}", error_type, message)),
                    };
                }
                ErrorSeverity::Transient => {}
            }
        }

        if total_requests < MIN_SAMPLE_SIZE {
            return ComponentReadiness {
                status: HealthStatus::Pass,
                message: None,
            };
        }

        if error_rate > FAIL_ERROR_RATE {
            ComponentReadiness {
                status: HealthStatus::Fail,
                message: Some(format!("High error rate: {:.1}%", error_rate * 100.0)),
            }
        } else if error_rate > WARN_ERROR_RATE {
            ComponentReadiness {
                status: HealthStatus::Warn,
                message: Some(format!("Elevated error rate: {:.1}%", error_rate * 100.0)),
            }
        } else {
            ComponentReadiness {
                status: HealthStatus::Pass,
                message: None,
            }
        }
    }

    fn classify_error_severity(error_type: &ErrorType, age: Duration) -> ErrorSeverity {
        match error_type {
            ErrorType::PaymentRequired
            | ErrorType::Unauthorized
            | ErrorType::NotFound
            | ErrorType::BadRequest => ErrorSeverity::Blocking,

            ErrorType::RateLimited => {
                if age < Duration::from_secs(RATE_LIMIT_FRESHNESS_SECS) {
                    ErrorSeverity::Degraded
                } else {
                    ErrorSeverity::Transient
                }
            }

            ErrorType::ServerError | ErrorType::ConnectionError => {
                if age < Duration::from_secs(SERVER_ERROR_FRESHNESS_SECS) {
                    ErrorSeverity::Degraded
                } else {
                    ErrorSeverity::Transient
                }
            }

            ErrorType::Other => ErrorSeverity::Transient,
        }
    }

    pub fn combine(components: &[ComponentReadiness]) -> HealthStatus {
        if components.iter().any(|c| c.status == HealthStatus::Fail) {
            HealthStatus::Fail
        } else if components.iter().any(|c| c.status == HealthStatus::Warn) {
            HealthStatus::Warn
        } else {
            HealthStatus::Pass
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_combine_any_fail_returns_fail() {
        let components = vec![
            ComponentReadiness {
                status: HealthStatus::Pass,
                message: None,
            },
            ComponentReadiness {
                status: HealthStatus::Fail,
                message: Some("error".to_string()),
            },
        ];
        assert_eq!(ReadinessPolicy::combine(&components), HealthStatus::Fail);
    }

    #[test]
    fn test_combine_any_warn_returns_warn() {
        let components = vec![
            ComponentReadiness {
                status: HealthStatus::Pass,
                message: None,
            },
            ComponentReadiness {
                status: HealthStatus::Warn,
                message: Some("warning".to_string()),
            },
        ];
        assert_eq!(ReadinessPolicy::combine(&components), HealthStatus::Warn);
    }

    #[test]
    fn test_combine_all_pass_returns_pass() {
        let components = vec![
            ComponentReadiness {
                status: HealthStatus::Pass,
                message: None,
            },
            ComponentReadiness {
                status: HealthStatus::Pass,
                message: None,
            },
        ];
        assert_eq!(ReadinessPolicy::combine(&components), HealthStatus::Pass);
    }
}
