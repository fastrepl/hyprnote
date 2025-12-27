use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    pub openrouter_api_key: String,
    pub num_evals: i32,
    pub timeout_seconds: u64,
    pub concurrency: usize,
}

impl Config {
    pub fn timeout(&self) -> Duration {
        Duration::from_secs(self.timeout_seconds)
    }

    pub fn enabled(&self) -> bool {
        self.num_evals > 0
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            openrouter_api_key: String::new(),
            num_evals: 0,
            timeout_seconds: 60,
            concurrency: 4,
        }
    }
}

pub fn parse_config() -> Config {
    Config {
        openrouter_api_key: std::env::var("OPENROUTER_API_KEY").unwrap_or_default(),
        num_evals: std::env::var("EVALS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0),
        timeout_seconds: std::env::var("EVALS_TIMEOUT_SECONDS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(60),
        concurrency: std::env::var("EVALS_CONCURRENCY")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(4),
    }
}
