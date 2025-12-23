use std::time::Duration;
use tokio_tungstenite::tungstenite::protocol::Message;

#[derive(Clone, Debug)]
pub struct ConnectionConfig {
    pub connect_timeout: Duration,
    pub retry_config: RetryConfig,
    pub close_grace_period: Duration,
}

impl Default for ConnectionConfig {
    fn default() -> Self {
        Self {
            connect_timeout: Duration::from_secs(8),
            retry_config: RetryConfig::default(),
            close_grace_period: Duration::from_secs(5),
        }
    }
}

#[derive(Clone, Debug)]
pub struct RetryConfig {
    pub max_attempts: usize,
    pub delay: Duration,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 5,
            delay: Duration::from_millis(500),
        }
    }
}

#[derive(Clone, Debug)]
pub struct KeepAliveConfig {
    pub interval: Duration,
    pub message: Message,
}
