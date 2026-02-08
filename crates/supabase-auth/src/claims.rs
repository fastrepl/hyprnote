use chrono::{DateTime, Utc};

use crate::error::{Error, TokenValidationError};
use crate::types::SubscriptionStatus;

/// JWT claims structure for Supabase authentication tokens.
///
/// This structure contains the standard JWT claims along with custom
/// claims for subscription and entitlement information.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Claims {
    /// Subject: unique identifier for the authenticated user.
    pub sub: String,

    /// Email address of the authenticated user (if available).
    #[serde(default)]
    pub email: Option<String>,

    /// List of entitlements/permissions granted to the user.
    #[serde(default)]
    pub entitlements: Vec<String>,

    /// Current subscription status (if user has a subscription).
    #[serde(default)]
    pub subscription_status: Option<SubscriptionStatus>,

    /// Trial end date as Unix timestamp (if user is in trial).
    #[serde(default, with = "chrono::serde::ts_seconds_option")]
    #[specta(type = Option<i64>)]
    pub trial_end: Option<DateTime<Utc>>,
}

impl Claims {
    /// Decodes JWT claims without signature verification.
    ///
    /// # Warning
    ///
    /// This method does NOT verify the token signature and should only be used
    /// in contexts where token authenticity is not required (e.g., extracting
    /// user ID for logging, displaying user info before full validation).
    ///
    /// For production authentication, use `SupabaseAuth::verify_token` instead.
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - Token format is invalid (not three dot-separated parts)
    /// - Payload is not valid base64
    /// - Payload cannot be deserialized as Claims
    pub fn decode_insecure(token: &str) -> Result<Self, Error> {
        use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};

        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 3 {
            return Err(TokenValidationError::InvalidFormat.into());
        }

        let payload = URL_SAFE_NO_PAD
            .decode(parts[1])
            .map_err(|e| TokenValidationError::DecodeError(e.to_string()))?;

        serde_json::from_slice(&payload)
            .map_err(|e| TokenValidationError::ClaimsDecodeError(e.to_string()).into())
    }

    /// Checks if the user has a specific entitlement.
    pub fn has_entitlement(&self, entitlement: &str) -> bool {
        self.entitlements.contains(&entitlement.to_string())
    }

    /// Checks if the user's subscription is active.
    pub fn has_active_subscription(&self) -> bool {
        matches!(
            self.subscription_status,
            Some(SubscriptionStatus::Active | SubscriptionStatus::Trialing)
        )
    }
}

#[cfg(test)]
mod tests {
    use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
    use chrono::Datelike;

    use super::*;

    fn make_test_token(payload: &str) -> String {
        let header = URL_SAFE_NO_PAD.encode(r#"{"alg":"ES256","typ":"JWT"}"#);
        let payload = URL_SAFE_NO_PAD.encode(payload);
        format!("{}.{}.fake_signature", header, payload)
    }

    #[test]
    fn test_decode_claims() {
        let payload = r#"{
            "sub": "user-123",
            "email": "test@example.com",
            "entitlements": ["hyprnote_pro"],
            "subscription_status": "trialing",
            "trial_end": 1771406553
        }"#;
        let token = make_test_token(payload);

        let claims = Claims::decode_insecure(&token).unwrap();
        assert_eq!(claims.sub, "user-123");
        assert_eq!(claims.email, Some("test@example.com".to_string()));
        assert_eq!(claims.entitlements, vec!["hyprnote_pro"]);
        assert!(matches!(
            claims.subscription_status,
            Some(SubscriptionStatus::Trialing)
        ));
        assert_eq!(claims.trial_end.unwrap().year(), 2026);
    }

    #[test]
    fn test_decode_claims_minimal() {
        let payload = r#"{"sub": "user-456"}"#;
        let token = make_test_token(payload);

        let claims = Claims::decode_insecure(&token).unwrap();
        assert_eq!(claims.sub, "user-456");
        assert_eq!(claims.email, None);
        assert!(claims.entitlements.is_empty());
        assert!(claims.subscription_status.is_none());
        assert!(claims.trial_end.is_none());
    }

    #[test]
    fn test_decode_invalid_token() {
        assert!(Claims::decode_insecure("invalid").is_err());
        assert!(Claims::decode_insecure("a.b").is_err());
        assert!(Claims::decode_insecure("a.!!!.c").is_err());
    }

    #[test]
    fn test_has_entitlement() {
        let payload = r#"{"sub": "user-123", "entitlements": ["pro", "admin"]}"#;
        let token = make_test_token(payload);
        let claims = Claims::decode_insecure(&token).unwrap();

        assert!(claims.has_entitlement("pro"));
        assert!(claims.has_entitlement("admin"));
        assert!(!claims.has_entitlement("enterprise"));
    }

    #[test]
    fn test_has_active_subscription() {
        let active_payload = r#"{"sub": "user-123", "subscription_status": "active"}"#;
        let token = make_test_token(active_payload);
        let claims = Claims::decode_insecure(&token).unwrap();
        assert!(claims.has_active_subscription());

        let trialing_payload = r#"{"sub": "user-123", "subscription_status": "trialing"}"#;
        let token = make_test_token(trialing_payload);
        let claims = Claims::decode_insecure(&token).unwrap();
        assert!(claims.has_active_subscription());

        let canceled_payload = r#"{"sub": "user-123", "subscription_status": "canceled"}"#;
        let token = make_test_token(canceled_payload);
        let claims = Claims::decode_insecure(&token).unwrap();
        assert!(!claims.has_active_subscription());
    }
}
