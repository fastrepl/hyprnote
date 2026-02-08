//! HTTP middleware configuration.
//!
//! This module provides middleware layers for:
//! - CORS (Cross-Origin Resource Sharing)
//! - Request tracing and observability
//! - Sentry error tracking

use axum::{body::Body, extract::MatchedPath, http::Request};
use sentry::integrations::tower::{NewSentryLayer, SentryHttpLayer};
use tower::ServiceBuilder;
use tower_http::{
    classify::ServerErrorsFailureClass,
    cors::{self, CorsLayer},
    trace::TraceLayer,
};

/// Builds the CORS middleware layer.
///
/// Configured to allow all origins, methods, and headers for maximum compatibility.
pub fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(cors::Any)
        .allow_methods(cors::Any)
        .allow_headers(cors::Any)
}

/// Builds the observability middleware stack including Sentry and tracing.
///
/// This layer provides:
/// - Sentry error tracking with transaction support
/// - HTTP request tracing with service-specific spans
/// - Request/response logging with latency metrics
/// - Automatic health check filtering
pub fn observability_layer() -> ServiceBuilder<
    tower::layer::util::Stack<
        sentry::integrations::tower::NewSentryLayer<Request<Body>>,
        tower::layer::util::Stack<
            sentry::integrations::tower::SentryHttpLayer,
            tower::layer::util::Identity,
        >,
    >,
> {
    ServiceBuilder::new()
        .layer(NewSentryLayer::<Request<Body>>::new_from_top())
        .layer(SentryHttpLayer::new().enable_transaction())
        .layer(build_trace_layer())
}

/// Builds the HTTP tracing layer with custom span and logging configuration.
fn build_trace_layer() -> TraceLayer<
    tower_http::classify::SharedClassifier<tower_http::classify::ServerErrorsAsFailures>,
    impl Fn(&Request<Body>) -> tracing::Span + Clone,
    impl Fn(&Request<Body>, &tracing::Span) + Clone,
    impl Fn(&axum::http::Response<axum::body::Body>, std::time::Duration, &tracing::Span) + Clone,
    (),
    (),
    impl Fn(ServerErrorsFailureClass, std::time::Duration, &tracing::Span) + Clone,
> {
    TraceLayer::new_for_http()
        .make_span_with(make_span)
        .on_request(on_request)
        .on_response(on_response)
        .on_failure(on_failure)
}

/// Creates a tracing span for an incoming HTTP request.
///
/// The span includes:
/// - HTTP method and matched route
/// - Service classification (llm, stt, or unknown)
/// - OpenTelemetry-compatible naming
///
/// Health check requests return a disabled span to reduce noise.
fn make_span(request: &Request<Body>) -> tracing::Span {
    let path = request.uri().path();

    // Skip tracing for health checks
    if path == "/health" {
        return tracing::Span::none();
    }

    let method = request.method();
    let matched_path = request
        .extensions()
        .get::<MatchedPath>()
        .map(MatchedPath::as_str)
        .unwrap_or(path);

    let (service, span_op) = classify_service_from_path(path);

    tracing::info_span!(
        "http_request",
        method = %method,
        http.route = %matched_path,
        service = %service,
        otel.name = %format!("{} {}", method, matched_path),
        span.op = %span_op,
    )
}

/// Classifies the service type based on the request path.
///
/// Returns a tuple of (service_name, span_operation) for tracing.
fn classify_service_from_path(path: &str) -> (&'static str, &'static str) {
    match path {
        p if p.starts_with("/llm") || p.starts_with("/chat/completions") => {
            ("llm", "http.server.llm")
        }
        p if p.starts_with("/stt") || p.starts_with("/listen") => ("stt", "http.server.stt"),
        _ => ("unknown", "http.server"),
    }
}

/// Called when a request is received (before processing).
fn on_request(request: &Request<Body>, _span: &tracing::Span) {
    // Skip logging for health checks
    if request.uri().path() == "/health" {
        return;
    }
    tracing::info!(
        method = %request.method(),
        path = %request.uri().path(),
        "http_request_started"
    );
}

/// Called when a response is sent (after successful processing).
fn on_response(
    response: &axum::http::Response<axum::body::Body>,
    latency: std::time::Duration,
    span: &tracing::Span,
) {
    if span.is_disabled() {
        return;
    }
    tracing::info!(
        parent: span,
        http_status = %response.status().as_u16(),
        latency_ms = %latency.as_millis(),
        "http_request_finished"
    );
}

/// Called when a request fails with a server error.
fn on_failure(
    failure_class: ServerErrorsFailureClass,
    latency: std::time::Duration,
    span: &tracing::Span,
) {
    if span.is_disabled() {
        return;
    }
    tracing::error!(
        parent: span,
        failure_class = ?failure_class,
        latency_ms = %latency.as_millis(),
        "http_request_failed"
    );
}
