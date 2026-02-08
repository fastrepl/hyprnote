//! Supabase JWT authentication library.
//!
//! This crate provides utilities for validating Supabase authentication tokens
//! and managing JWT verification with automatic JWKS caching.
//!
//! # Features
//!
//! - JWT token validation with signature verification
//! - Automatic JWKS fetching and caching
//! - Support for RS256 and ES256 signing algorithms
//! - Entitlement-based authorization
//! - Thread-safe token verification
//!
//! # Examples
//!
//! ```no_run
//! use supabase_auth::SupabaseAuth;
//!
//! # async fn example() -> Result<(), supabase_auth::Error> {
//! let auth = SupabaseAuth::new("https://your-project.supabase.co");
//!
//! let auth_header = "Bearer eyJhbGc...";
//! let token = supabase_auth::extract_token(auth_header).ok_or(supabase_auth::Error::InvalidAuthHeader)?;
//!
//! let claims = auth.verify_token(token).await?;
//! println!("Authenticated user: {}", claims.sub);
//! # Ok(())
//! # }
//! ```
//!
//! # References
//!
//! - [Supabase JWT Documentation](https://supabase.com/docs/guides/auth/jwts)
//! - [Supabase Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)

mod claims;
mod error;
mod jwks;
mod token;
mod types;

pub use claims::Claims;
pub use error::{Error, JwksFetchError, Result, TokenValidationError};
pub use token::extract_token;
pub use types::SubscriptionStatus;

use jwks::CachedJwks;

/// Main authentication handler for Supabase JWT tokens.
///
/// This struct manages JWKS caching and provides methods for token
/// validation and authorization checks.
#[derive(Clone)]
pub struct SupabaseAuth {
    jwks: CachedJwks,
}

impl SupabaseAuth {
    /// Creates a new `SupabaseAuth` instance.
    ///
    /// # Arguments
    ///
    /// * `supabase_url` - The base URL of your Supabase project (e.g., "https://your-project.supabase.co")
    ///
    /// # Examples
    ///
    /// ```
    /// use supabase_auth::SupabaseAuth;
    ///
    /// let auth = SupabaseAuth::new("https://your-project.supabase.co");
    /// ```
    pub fn new(supabase_url: &str) -> Self {
        let jwks_url = format!(
            "{}/auth/v1/.well-known/jwks.json",
            supabase_url.trim_end_matches('/')
        );
        Self {
            jwks: CachedJwks::new(jwks_url),
        }
    }

    /// Verifies a JWT token and returns the decoded claims.
    ///
    /// This method performs full signature verification, expiration checking,
    /// and audience validation.
    ///
    /// # Arguments
    ///
    /// * `token` - The JWT token string to verify (without "Bearer" prefix)
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - Token signature is invalid
    /// - Token has expired
    /// - Token audience is incorrect
    /// - JWKS cannot be fetched
    /// - Token format is malformed
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use supabase_auth::SupabaseAuth;
    /// # async fn example() -> Result<(), supabase_auth::Error> {
    /// let auth = SupabaseAuth::new("https://your-project.supabase.co");
    /// let claims = auth.verify_token("eyJhbGc...").await?;
    /// println!("User ID: {}", claims.sub);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn verify_token(&self, token: &str) -> Result<Claims> {
        let jwks = self.jwks.get().await?;
        token::validate_token(token, &jwks)
    }

    /// Verifies a token and checks for a required entitlement.
    ///
    /// This is a convenience method that combines token verification with
    /// entitlement checking.
    ///
    /// # Arguments
    ///
    /// * `token` - The JWT token string to verify
    /// * `entitlement` - The required entitlement string to check for
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - Token verification fails (see `verify_token`)
    /// - User does not have the required entitlement
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use supabase_auth::SupabaseAuth;
    /// # async fn example() -> Result<(), supabase_auth::Error> {
    /// let auth = SupabaseAuth::new("https://your-project.supabase.co");
    /// let claims = auth.require_entitlement("eyJhbGc...", "hyprnote_pro").await?;
    /// println!("User has pro access: {}", claims.sub);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn require_entitlement(&self, token: &str, entitlement: &str) -> Result<Claims> {
        let claims = self.verify_token(token).await?;

        if !claims.has_entitlement(entitlement) {
            return Err(Error::MissingEntitlement(entitlement.to_string()));
        }

        Ok(claims)
    }
}
