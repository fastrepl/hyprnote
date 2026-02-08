use jsonwebtoken::jwk::{JwkSet, KeyAlgorithm};
use jsonwebtoken::{Algorithm, DecodingKey, TokenData, Validation, decode, decode_header};

use crate::claims::Claims;
use crate::error::{Error, TokenValidationError};

/// Extracts the JWT token from an Authorization header.
///
/// Supports both "Bearer" and "bearer" prefixes.
///
/// # Examples
///
/// ```
/// # use supabase_auth::extract_token;
/// assert_eq!(extract_token("Bearer abc123"), Some("abc123"));
/// assert_eq!(extract_token("bearer xyz789"), Some("xyz789"));
/// assert_eq!(extract_token("abc123"), None);
/// ```
pub fn extract_token(auth_header: &str) -> Option<&str> {
    auth_header
        .strip_prefix("Bearer ")
        .or_else(|| auth_header.strip_prefix("bearer "))
}

/// Validates a JWT token using the provided JWKS.
///
/// This function performs the following validations:
/// - Verifies the token signature using keys from JWKS
/// - Checks token expiration
/// - Validates the audience claim (must be "authenticated")
/// - Supports RS256 and ES256 algorithms
///
/// # Arguments
///
/// * `token` - The JWT token string to validate
/// * `jwks` - The JSON Web Key Set to use for signature verification
///
/// # Errors
///
/// Returns an error if:
/// - Token format is invalid
/// - Token header is missing or malformed
/// - Key ID (kid) is not found in JWKS
/// - Signature verification fails
/// - Token is expired
/// - Audience claim is invalid
pub fn validate_token(token: &str, jwks: &JwkSet) -> Result<Claims, Error> {
    let header =
        decode_header(token).map_err(|e| TokenValidationError::InvalidHeader(e.to_string()))?;

    let kid = header
        .kid
        .as_deref()
        .ok_or(TokenValidationError::MissingKeyId)?;

    let jwk = jwks
        .find(kid)
        .ok_or_else(|| TokenValidationError::KeyNotFound(kid.to_string()))?;

    let algorithm = algorithm_from_jwk(jwk.common.key_algorithm)?;

    let decoding_key =
        DecodingKey::from_jwk(jwk).map_err(|e| TokenValidationError::DecodeError(e.to_string()))?;

    let validation = create_validation(algorithm);

    let token_data: TokenData<Claims> = decode(token, &decoding_key, &validation)
        .map_err(|e| TokenValidationError::DecodeError(e.to_string()))?;

    Ok(token_data.claims)
}

/// Converts a JWK key algorithm to a jsonwebtoken Algorithm.
fn algorithm_from_jwk(key_algorithm: Option<KeyAlgorithm>) -> Result<Algorithm, Error> {
    match key_algorithm {
        Some(KeyAlgorithm::RS256) => Ok(Algorithm::RS256),
        Some(KeyAlgorithm::ES256) => Ok(Algorithm::ES256),
        other => Err(TokenValidationError::UnsupportedAlgorithm(other).into()),
    }
}

/// Creates validation parameters for JWT verification.
fn create_validation(algorithm: Algorithm) -> Validation {
    let mut validation = Validation::new(algorithm);
    validation.validate_exp = true;
    validation.set_audience(&["authenticated"]);
    validation
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_token_with_bearer() {
        assert_eq!(extract_token("Bearer abc123"), Some("abc123"));
    }

    #[test]
    fn test_extract_token_with_lowercase_bearer() {
        assert_eq!(extract_token("bearer xyz789"), Some("xyz789"));
    }

    #[test]
    fn test_extract_token_without_prefix() {
        assert_eq!(extract_token("abc123"), None);
    }

    #[test]
    fn test_extract_token_empty() {
        assert_eq!(extract_token(""), None);
    }
}
