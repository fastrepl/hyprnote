use restate_sdk::prelude::*;
use restate_sdk::serde::Json;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct LimiterState {
    pub limit: f64,
    pub burst: u32,
    pub tokens: f64,
    pub last: u64,
    pub last_event: u64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Reservation {
    pub ok: bool,
    pub tokens: u32,
    pub creation_date: u64,
    pub date_to_act: u64,
    pub limit: f64,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReserveRequest {
    #[serde(default = "default_one")]
    pub n: u32,
    #[serde(default)]
    pub wait_limit_ms: u64,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetRateRequest {
    pub limit: Option<f64>,
    pub burst: Option<u32>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AllowRequest {
    #[serde(default = "default_one")]
    pub n: u32,
    pub limit: f64,
    pub burst: u32,
}

fn default_one() -> u32 {
    1
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

fn advance(state: &LimiterState, now: u64) -> f64 {
    let last = if now <= state.last { now } else { state.last };
    let elapsed_ms = now.saturating_sub(last);
    let delta = tokens_from_duration(state.limit, elapsed_ms);
    let tokens = state.tokens + delta;
    tokens.min(state.burst as f64)
}

fn duration_from_tokens(limit: f64, tokens: f64) -> f64 {
    if limit <= 0.0 {
        return f64::INFINITY;
    }
    (tokens / limit) * 1000.0
}

fn tokens_from_duration(limit: f64, duration_ms: u64) -> f64 {
    if limit <= 0.0 {
        return 0.0;
    }
    (duration_ms as f64 / 1000.0) * limit
}

#[restate_sdk::object]
pub trait RateLimiter {
    async fn state() -> Result<Json<LimiterState>, HandlerError>;

    async fn tokens() -> Result<Json<f64>, HandlerError>;

    async fn reserve(req: Json<ReserveRequest>) -> Result<Json<Reservation>, HandlerError>;

    #[name = "setRate"]
    async fn set_rate(req: Json<SetRateRequest>) -> Result<(), HandlerError>;

    #[name = "cancelReservation"]
    async fn cancel_reservation(r: Json<Reservation>) -> Result<(), HandlerError>;

    /// Convenience handler: auto-initializes the limiter on first use and rejects
    /// with 429 if tokens are not immediately available. Equivalent to
    /// `reserve(n, waitLimit=0)` with auto-init.
    async fn allow(req: Json<AllowRequest>) -> Result<(), HandlerError>;

    async fn reset() -> Result<(), HandlerError>;
}

pub struct RateLimiterImpl;

impl RateLimiter for RateLimiterImpl {
    async fn state(&self, ctx: ObjectContext<'_>) -> Result<Json<LimiterState>, HandlerError> {
        let state = ctx
            .get::<Json<LimiterState>>("state")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or_default();
        Ok(Json(state))
    }

    async fn tokens(&self, ctx: ObjectContext<'_>) -> Result<Json<f64>, HandlerError> {
        let state = ctx
            .get::<Json<LimiterState>>("state")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or_default();
        let tokens = advance(&state, now_ms());
        Ok(Json(tokens))
    }

    async fn reserve(
        &self,
        ctx: ObjectContext<'_>,
        req: Json<ReserveRequest>,
    ) -> Result<Json<Reservation>, HandlerError> {
        let req = req.into_inner();

        let state = ctx
            .get::<Json<LimiterState>>("state")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or_default();

        if state.limit == f64::INFINITY {
            let now: u64 = ctx
                .run(|| async { Ok(now_ms()) })
                .name("get-current-time")
                .await?;
            return Ok(Json(Reservation {
                ok: true,
                tokens: req.n,
                creation_date: now,
                date_to_act: now,
                limit: 0.0,
            }));
        }

        let now: u64 = ctx
            .run(|| async { Ok(now_ms()) })
            .name("get-current-time")
            .await?;

        let tokens = advance(&state, now) - req.n as f64;

        let wait_duration_ms = if tokens < 0.0 {
            duration_from_tokens(state.limit, -tokens) as u64
        } else {
            0
        };

        let ok = req.n <= state.burst && wait_duration_ms <= req.wait_limit_ms;

        if ok {
            let reservation = Reservation {
                ok: true,
                tokens: req.n,
                creation_date: now,
                date_to_act: now + wait_duration_ms,
                limit: state.limit,
            };
            ctx.set(
                "state",
                Json(LimiterState {
                    last: now,
                    tokens,
                    last_event: reservation.date_to_act,
                    ..state
                }),
            );
            Ok(Json(reservation))
        } else {
            Ok(Json(Reservation {
                ok: false,
                tokens: 0,
                creation_date: now,
                date_to_act: 0,
                limit: state.limit,
            }))
        }
    }

    async fn set_rate(
        &self,
        ctx: ObjectContext<'_>,
        req: Json<SetRateRequest>,
    ) -> Result<(), HandlerError> {
        let req = req.into_inner();
        if req.limit.is_none() && req.burst.is_none() {
            return Ok(());
        }

        let mut state = ctx
            .get::<Json<LimiterState>>("state")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or_default();

        let now: u64 = ctx
            .run(|| async { Ok(now_ms()) })
            .name("get-current-time")
            .await?;

        let tokens = advance(&state, now);
        state.last = now;
        state.tokens = tokens;

        if let Some(limit) = req.limit {
            state.limit = limit;
        }
        if let Some(burst) = req.burst {
            state.burst = burst;
        }

        ctx.set("state", Json(state));
        Ok(())
    }

    async fn cancel_reservation(
        &self,
        ctx: ObjectContext<'_>,
        r: Json<Reservation>,
    ) -> Result<(), HandlerError> {
        let r = r.into_inner();

        let mut state = ctx
            .get::<Json<LimiterState>>("state")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or_default();

        let now: u64 = ctx
            .run(|| async { Ok(now_ms()) })
            .name("get-current-time")
            .await?;

        if state.limit == f64::INFINITY || r.tokens == 0 || r.date_to_act < now {
            return Ok(());
        }

        let other_tokens = if state.last_event > r.date_to_act {
            tokens_from_duration(r.limit, state.last_event - r.date_to_act)
        } else {
            0.0
        };
        let restore_tokens = r.tokens as f64 - other_tokens;
        if restore_tokens <= 0.0 {
            return Ok(());
        }

        let mut tokens = advance(&state, now) + restore_tokens;
        if tokens > state.burst as f64 {
            tokens = state.burst as f64;
        }

        state.last = now;
        state.tokens = tokens;

        if r.date_to_act == state.last_event {
            let prev_event_duration = duration_from_tokens(r.limit, r.tokens as f64);
            let prev_event = r.date_to_act.saturating_sub(prev_event_duration as u64);
            if prev_event >= now {
                state.last_event = prev_event;
            }
        }

        ctx.set("state", Json(state));
        Ok(())
    }

    async fn allow(
        &self,
        ctx: ObjectContext<'_>,
        req: Json<AllowRequest>,
    ) -> Result<(), HandlerError> {
        let req = req.into_inner();

        let mut state = ctx
            .get::<Json<LimiterState>>("state")
            .await?
            .map(|j| j.into_inner())
            .unwrap_or_default();

        if state.burst == 0 {
            state.limit = req.limit;
            state.burst = req.burst;
            state.tokens = req.burst as f64;
        }

        let now: u64 = ctx
            .run(|| async { Ok(now_ms()) })
            .name("get-current-time")
            .await?;

        let tokens = advance(&state, now) - req.n as f64;
        let ok = req.n <= state.burst && tokens >= 0.0;

        if !ok {
            return Err(TerminalError::new_with_code(429, "rate_limit_exceeded").into());
        }

        state.last = now;
        state.tokens = tokens;
        state.last_event = now;
        ctx.set("state", Json(state));

        Ok(())
    }

    async fn reset(&self, ctx: ObjectContext<'_>) -> Result<(), HandlerError> {
        ctx.clear("state");
        Ok(())
    }
}
