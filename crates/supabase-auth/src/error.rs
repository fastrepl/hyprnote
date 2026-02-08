use serde::{Serialize, ser::Serializer};

/// Authentication and authorization errors.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// Authorization header is missing from the request.
    #[error("missing authorization header")]
    MissingAuthHeader,

    /// Authorization header format is invalid (must be "Bearer <token>").
    #[error("invalid authorization header")]
    InvalidAuthHeader,

    /// Failed to fetch or parse JWKS from Supabase.
    #[error("failed to fetch JWKS: {0}")]
    JwksFetch(#[from] JwksFetchError),

    /// Token validation failed.
    #[error("token validation failed: {0}")]
    TokenValidation(#[from] TokenValidationError),

    /// Required entitlement is missing from user claims.
    #[error("missing required entitlement: {0}")]
    MissingEntitlement(String),
}

/// Errors that can occur when fetching JWKS.
#[derive(Debug, thiserror::Error)]
pub enum JwksFetchError {
    /// Network request to fetch JWKS failed.
    #[error("network request failed: {0}")]
    NetworkError(String),

    /// Failed to parse JWKS response.
    #[error("failed to parse JWKS response: {0}")]
    ParseError(String),
}

/// Errors that can occur during token validation.
#[derive(Debug, thiserror::Error)]
pub enum TokenValidationError {
    /// Token format is invalid (not a valid JWT structure).
    #[error("invalid token format")]
    InvalidFormat,

    /// Token header is missing or invalid.
    #[error("invalid token header: {0}")]
    InvalidHeader(String),

    /// Key ID (kid) is missing from token header.
    #[error("missing key ID in token header")]
    MissingKeyId,

    /// Key ID from token not found in JWKS.
    #[error("key ID not found in JWKS: {0}")]
    KeyNotFound(String),

    /// Unsupported or invalid signing algorithm.
    #[error("unsupported algorithm: {0:?}")]
    UnsupportedAlgorithm(Option<jsonwebtoken::jwk::KeyAlgorithm>),

    /// Failed to decode JWT with the provided key.
    #[error("failed to decode JWT: {0}")]
    DecodeError(String),

    /// Token signature verification failed.
    #[error("signature verification failed")]
    SignatureVerificationFailed,

    /// Token has expired.
    #[error("token has expired")]
    TokenExpired,

    /// Token audience claim is invalid.
    #[error("invalid audience claim")]
    InvalidAudience,

    /// Failed to decode token claims.
    #[error("failed to decode claims: {0}")]
    ClaimsDecodeError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

/// Type alias for Results using the authentication Error type.
pub type Result<T> = std::result::Result<T, Error>;
