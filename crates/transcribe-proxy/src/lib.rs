//! # Transcription Proxy Library
//!
//! A high-performance WebSocket proxy for Speech-to-Text (STT) transcription services.
//!
//! This library provides a unified interface for proxying transcription requests to multiple
//! upstream STT providers (Deepgram, AssemblyAI, Soniox, etc.) with features including:
//!
//! - **Provider Selection**: Automatic or manual provider selection based on availability and language support
//! - **Intelligent Routing**: HyprNote routing algorithm for optimal provider selection
//! - **WebSocket Relay**: Efficient bidirectional message relay with control message prioritization
//! - **Analytics**: Built-in analytics reporting for transcription events
//! - **Error Handling**: Comprehensive error detection and retry logic
//!
//! ## Example
//!
//! ```rust,no_run
//! use transcribe_proxy::{SttProxyConfig, Env, router};
//!
//! # async fn example() -> Result<(), Box<dyn std::error::Error>> {
//! // Load configuration from environment
//! let env = Env::default();
//! let config = SttProxyConfig::new(&env);
//!
//! // Create the router
//! let app = router(config);
//!
//! // Serve with axum
//! let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await?;
//! axum::serve(listener, app).await?;
//! # Ok(())
//! # }
//! ```

mod analytics;
mod config;
mod error;
mod openapi;
mod provider;
mod query_params;
mod relay;
mod routes;
mod upstream_url;

// Configuration
pub use config::{ApiKeys, DEFAULT_CONNECT_TIMEOUT_MS, Env, SttProxyConfig};

// Error types
pub use error::{ProviderSelectionError, ProxyError};

// Provider selection and routing
pub use provider::{
    HyprnoteRouter, HyprnoteRoutingConfig, ProviderSelector, RetryConfig, SelectedProvider,
    is_retryable_error, should_use_hyprnote_routing,
};

// WebSocket relay/proxy
pub use relay::{ClientRequestBuilder, UpstreamError, WebSocketProxy, detect_upstream_error};

// Analytics
pub use analytics::{SttAnalyticsReporter, SttEvent};
pub use hypr_analytics::{AuthenticatedUserId, DeviceFingerprint};

// HTTP routes
pub use routes::{listen_router, router};

// Utilities
pub use openapi::openapi;
pub use upstream_url::UpstreamUrlBuilder;
