use restate_sdk::prelude::*;
use restate_sdk::serde::Json;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateLimitConfig {
    pub window_ms: u64,
    pub max_in_window: u64,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct RateLimitState {
    window_start_ms: u64,
    count: u64,
}

#[restate_sdk::object]
pub trait RateLimiter {
    #[name = "checkAndConsume"]
    async fn check_and_consume(config: Json<RateLimitConfig>) -> Result<(), HandlerError>;
    async fn reset() -> Result<(), HandlerError>;
}

pub struct RateLimiterImpl;

impl RateLimiter for RateLimiterImpl {
    async fn check_and_consume(
        &self,
        ctx: ObjectContext<'_>,
        config: Json<RateLimitConfig>,
    ) -> Result<(), HandlerError> {
        let config = config.into_inner();
        let now: u64 = ctx
            .run(|| async {
                Ok(std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64)
            })
            .await?;

        let state: RateLimitState = ctx
            .get::<Json<RateLimitState>>("state")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or_default();

        let current = if now - state.window_start_ms >= config.window_ms {
            RateLimitState {
                window_start_ms: now,
                count: 0,
            }
        } else {
            state
        };

        if current.count >= config.max_in_window {
            ctx.set("state", Json(current));
            return Err(TerminalError::new_with_code(429, "rate_limit_exceeded").into());
        }

        ctx.set(
            "state",
            Json(RateLimitState {
                count: current.count + 1,
                ..current
            }),
        );
        Ok(())
    }

    async fn reset(&self, ctx: ObjectContext<'_>) -> Result<(), HandlerError> {
        ctx.clear("state");
        Ok(())
    }
}
