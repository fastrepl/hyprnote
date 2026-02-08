//! WebSocket relay/proxy functionality
//!
//! This module provides components for proxying WebSocket connections between
//! clients and upstream STT providers. It handles message transformation,
//! control message filtering, and connection lifecycle management.

mod builder;
mod handler;
mod pending;
mod types;
mod upstream_error;

pub use builder::ClientRequestBuilder;
pub use handler::WebSocketProxy;
pub use upstream_error::{UpstreamError, detect_upstream_error};
