//! Observability and monitoring setup.
//!
//! This module configures:
//! - Sentry for error tracking and performance monitoring
//! - Tracing subscriber for structured logging
//! - Integration between Sentry and tracing

use std::time::Duration;

use tracing_subscriber::prelude::*;

use crate::constants::SERVICE_NAME;

/// Initializes Sentry with the provided configuration.
///
/// Returns a guard that must be kept alive for the duration of the application.
/// When dropped, the guard will flush pending events to Sentry.
///
/// # Arguments
///
/// * `dsn` - Optional Sentry DSN URL for error reporting
///
/// # Environment Detection
///
/// Automatically sets the environment to:
/// - "development" in debug builds
/// - "production" in release builds
pub fn init_sentry(dsn: Option<&str>) -> sentry::ClientInitGuard {
    let dsn = dsn.and_then(|s| s.parse().ok());

    let guard = sentry::init(sentry::ClientOptions {
        dsn,
        release: option_env!("APP_VERSION").map(|v| format!("hyprnote-ai@{}", v).into()),
        environment: Some(get_environment().into()),
        traces_sample_rate: 1.0,
        sample_rate: 1.0,
        send_default_pii: true,
        auto_session_tracking: true,
        session_mode: sentry::SessionMode::Request,
        attach_stacktrace: true,
        max_breadcrumbs: 100,
        ..Default::default()
    });

    // Set global service tag
    sentry::configure_scope(|scope| {
        scope.set_tag("service", SERVICE_NAME);
    });

    guard
}

/// Returns the environment name based on the build configuration.
fn get_environment() -> &'static str {
    if cfg!(debug_assertions) {
        "development"
    } else {
        "production"
    }
}

/// Initializes the tracing subscriber with Sentry integration.
///
/// Sets up a layered subscriber with:
/// - Environment-based log filtering (defaults to "info,tower_http=debug")
/// - Formatted output to stdout
/// - Sentry integration for error reporting
///
/// # Panics
///
/// Panics if the subscriber fails to initialize (shouldn't happen in normal operation).
pub fn init_tracing() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .with(sentry::integrations::tracing::layer())
        .init();
}

/// Closes the Sentry client and flushes pending events.
///
/// Should be called during graceful shutdown to ensure all events are sent.
///
/// # Arguments
///
/// * `timeout` - Maximum time to wait for events to be flushed
pub fn shutdown_sentry(timeout: Duration) {
    if let Some(client) = sentry::Hub::current().client() {
        client.close(Some(timeout));
    }
}
