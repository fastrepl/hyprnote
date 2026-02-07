use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub fn verify_webhook_signature(
    secret: &str,
    body: &str,
    signature: &str,
) -> Result<(), crate::Error> {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| crate::Error::WebhookSignature(e.to_string()))?;
    mac.update(body.as_bytes());
    let expected = format!("{:x}", mac.finalize().into_bytes());

    if expected != signature {
        return Err(crate::Error::WebhookSignature(
            "invalid signature".to_string(),
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_valid_signature() {
        let secret = "test-secret";
        let body = r#"{"type":"auth","operation":"creation"}"#;

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(body.as_bytes());
        let signature = format!("{:x}", mac.finalize().into_bytes());

        assert!(verify_webhook_signature(secret, body, &signature).is_ok());
    }

    #[test]
    fn test_verify_invalid_signature() {
        let secret = "test-secret";
        let body = r#"{"type":"auth","operation":"creation"}"#;

        assert!(verify_webhook_signature(secret, body, "invalid-sig").is_err());
    }
}
