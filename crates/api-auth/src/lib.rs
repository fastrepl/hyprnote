//! API authentication library for Hyprnote.
//!
//! This crate provides Axum middleware for authenticating API requests
//! using Supabase JWT tokens and verifying user entitlements.
//!
//! # Example
//!
//! ```no_run
//! use axum::{Router, routing::get, middleware, extract::Extension};
//! use api_auth::{AuthState, require_auth, Claims};
//!
//! async fn protected_handler(Extension(claims): Extension<Claims>) -> String {
//!     format!("Hello, user {}!", claims.sub)
//! }
//!
//! #[tokio::main]
//! async fn main() {
//!     let state = AuthState::new(
//!         "https://example.supabase.co",
//!         "hyprnote_pro"
//!     );
//!
//!     let app = Router::new()
//!         .route("/protected", get(protected_handler))
//!         .layer(middleware::from_fn_with_state(state.clone(), require_auth))
//!         .with_state(state);
//!
//!     // Run your server...
//! }
//! ```

mod error;
mod middleware;
mod state;

// Re-export public API
pub use error::AuthError;
pub use middleware::require_auth;
pub use state::AuthState;

// Re-export Claims from the underlying auth library for convenience
pub use hypr_supabase_auth::Claims;
