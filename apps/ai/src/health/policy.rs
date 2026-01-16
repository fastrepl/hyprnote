use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::state::{ComponentHealth, ErrorType};

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
    pub fn evaluate(component: &ComponentHealth) -> ComponentReadiness {
        if let Some(ref error) = component.last_error {
            match Self::classify_error_severity(&error.error_type, error.timestamp.elapsed()) {
                ErrorSeverity::Blocking => {
                    return ComponentReadiness {
                        status: HealthStatus::Fail,
                        message: Some(format!("{}: {}", error.error_type.display(), error.message)),
                    };
                }
                ErrorSeverity::Degraded => {
                    return ComponentReadiness {
                        status: HealthStatus::Warn,
                        message: Some(format!("{}: {}", error.error_type.display(), error.message)),
                    };
                }
                ErrorSeverity::Transient => {}
            }
        }

        if component.total_requests() < MIN_SAMPLE_SIZE {
            return ComponentReadiness {
                status: HealthStatus::Pass,
                message: None,
            };
        }

        let error_rate = component.error_rate();
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
    use std::time::Instant;

    use crate::health::state::ErrorEvent;

    fn create_component_with_error(error_type: ErrorType, age_secs: u64) -> ComponentHealth {
        let mut component = ComponentHealth::new_for_test();
        component.last_error = Some(ErrorEvent {
            timestamp: Instant::now() - Duration::from_secs(age_secs),
            error_type,
            message: "Test error".to_string(),
            provider: None,
        });
        component
    }

    #[test]
    fn test_payment_required_always_fails() {
        let component = create_component_with_error(ErrorType::PaymentRequired, 600);
        let readiness = ReadinessPolicy::evaluate(&component);
        assert_eq!(readiness.status, HealthStatus::Fail);
    }

    #[test]
    fn test_unauthorized_always_fails() {
        let component = create_component_with_error(ErrorType::Unauthorized, 600);
        let readiness = ReadinessPolicy::evaluate(&component);
        assert_eq!(readiness.status, HealthStatus::Fail);
    }

    #[test]
    fn test_bad_request_always_fails() {
        let component = create_component_with_error(ErrorType::BadRequest, 600);
        let readiness = ReadinessPolicy::evaluate(&component);
        assert_eq!(readiness.status, HealthStatus::Fail);
    }

    #[test]
    fn test_recent_rate_limit_warns() {
        let component = create_component_with_error(ErrorType::RateLimited, 30);
        let readiness = ReadinessPolicy::evaluate(&component);
        assert_eq!(readiness.status, HealthStatus::Warn);
    }

    #[test]
    fn test_old_rate_limit_passes() {
        let component = create_component_with_error(ErrorType::RateLimited, 120);
        let readiness = ReadinessPolicy::evaluate(&component);
        assert_eq!(readiness.status, HealthStatus::Pass);
    }

    #[test]
    fn test_recent_server_error_warns() {
        let component = create_component_with_error(ErrorType::ServerError, 15);
        let readiness = ReadinessPolicy::evaluate(&component);
        assert_eq!(readiness.status, HealthStatus::Warn);
    }

    #[test]
    fn test_old_server_error_passes() {
        let component = create_component_with_error(ErrorType::ServerError, 60);
        let readiness = ReadinessPolicy::evaluate(&component);
        assert_eq!(readiness.status, HealthStatus::Pass);
    }

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
