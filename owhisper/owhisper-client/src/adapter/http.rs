use reqwest::Response;
use serde::de::DeserializeOwned;

use crate::error::Error;

pub async fn ensure_success(response: Response) -> Result<Response, Error> {
    let status = response.status();
    if status.is_success() {
        Ok(response)
    } else {
        let body = response.text().await.unwrap_or_default();
        Err(Error::UnexpectedStatus { status, body })
    }
}

pub async fn parse_json_response<T: DeserializeOwned>(
    response: Response,
    provider: &str,
) -> Result<T, Error> {
    let response = ensure_success(response).await?;
    let text = response.text().await?;

    match serde_json::from_str(&text) {
        Ok(v) => Ok(v),
        Err(e) => {
            tracing::warn!(
                error = ?e,
                %provider,
                body = %text,
                "stt_json_parse_failed"
            );
            Err(Error::AudioProcessing(format!(
                "JSON parse error for {}: {}",
                provider, e
            )))
        }
    }
}

pub fn parse_provider_json<T: DeserializeOwned>(raw: &str, provider: &str) -> Option<T> {
    match serde_json::from_str(raw) {
        Ok(v) => Some(v),
        Err(e) => {
            tracing::warn!(
                error = ?e,
                %provider,
                raw,
                "stt_json_parse_failed"
            );
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_provider_json_success() {
        let json = r#"{"key": "value"}"#;
        let result: Option<serde_json::Value> = parse_provider_json(json, "test");
        assert!(result.is_some());
        assert_eq!(result.unwrap()["key"], "value");
    }

    #[test]
    fn test_parse_provider_json_failure() {
        let json = "invalid json";
        let result: Option<serde_json::Value> = parse_provider_json(json, "test");
        assert!(result.is_none());
    }
}
