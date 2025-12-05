//! WebSocket client and server utilities for real-time audio streaming.
//!
//! This crate provides a high-level WebSocket client for streaming audio data
//! to speech-to-text services with automatic retry, keep-alive, and graceful shutdown.

#[cfg(feature = "client")]
pub mod client;

#[cfg(feature = "client")]
pub mod config;

#[cfg(feature = "server")]
pub mod server;

mod error;
pub use error::*;
