//! Provider selection and routing logic
//!
//! This module contains all logic related to selecting and routing to different
//! STT (Speech-to-Text) providers.

mod routing;
mod selector;

pub use routing::{
    HyprnoteRouter, HyprnoteRoutingConfig, RetryConfig, is_retryable_error,
    should_use_hyprnote_routing,
};
pub use selector::{ProviderSelector, SelectedProvider};
