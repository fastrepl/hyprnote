use serde::Deserialize;

#[derive(Debug, Clone)]
pub struct UpstreamError {
    pub code: u16,
    pub message: String,
    pub provider_code: Option<String>,
}

impl UpstreamError {
    pub fn to_close_code(&self) -> u16 {
        match self.code {
            400 => 4400,
            401 => 4401,
            402 => 4402,
            403 => 4403,
            404 => 4404,
            429 => 4429,
            500..=599 => 4500,
            _ => 4000,
        }
    }
}

#[derive(Deserialize)]
struct SonioxError<'a> {
    #[serde(borrow)]
    error_code: Option<ErrorCode<'a>>,
    #[serde(borrow)]
    error_message: Option<&'a str>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum ErrorCode<'a> {
    Number(u16),
    #[serde(borrow)]
    String(&'a str),
}

impl ErrorCode<'_> {
    fn as_u16(&self) -> u16 {
        match self {
            ErrorCode::Number(n) => *n,
            ErrorCode::String(s) => s.parse().unwrap_or(500),
        }
    }

    fn as_string(&self) -> String {
        match self {
            ErrorCode::Number(n) => n.to_string(),
            ErrorCode::String(s) => s.to_string(),
        }
    }
}

#[derive(Deserialize)]
struct DeepgramError<'a> {
    #[serde(borrow)]
    err_code: Option<&'a str>,
    #[serde(borrow)]
    err_msg: Option<&'a str>,
    #[serde(borrow)]
    category: Option<&'a str>,
    #[serde(borrow)]
    message: Option<&'a str>,
}

pub fn detect_upstream_error(data: &[u8]) -> Option<UpstreamError> {
    let text = std::str::from_utf8(data).ok()?;

    if let Some(err) = try_parse_soniox_error(text) {
        return Some(err);
    }

    if let Some(err) = try_parse_deepgram_error(text) {
        return Some(err);
    }

    None
}

fn try_parse_soniox_error(text: &str) -> Option<UpstreamError> {
    let parsed: SonioxError = serde_json::from_str(text).ok()?;

    if parsed.error_code.is_none() && parsed.error_message.is_none() {
        return None;
    }

    let code = parsed
        .error_code
        .as_ref()
        .map(|c| c.as_u16())
        .unwrap_or(500);
    let provider_code = parsed.error_code.as_ref().map(|c| c.as_string());
    let message = parsed.error_message.unwrap_or("Unknown error").to_string();

    Some(UpstreamError {
        code,
        message,
        provider_code,
    })
}

fn try_parse_deepgram_error(text: &str) -> Option<UpstreamError> {
    let parsed: DeepgramError = serde_json::from_str(text).ok()?;

    if !is_deepgram_error_message(&parsed) {
        return None;
    }

    let code = determine_deepgram_error_code(&parsed);
    let provider_code = parsed.err_code.or(parsed.category).map(|s| s.to_string());
    let message = parsed
        .err_msg
        .or(parsed.message)
        .unwrap_or("Unknown error")
        .to_string();

    Some(UpstreamError {
        code,
        message,
        provider_code,
    })
}

fn is_deepgram_error_message(parsed: &DeepgramError) -> bool {
    let has_fields = parsed.err_code.is_some()
        || parsed.err_msg.is_some()
        || parsed.category.is_some()
        || parsed.message.is_some();

    if !has_fields {
        return false;
    }

    parsed.err_code.is_some()
        || parsed.category.is_some()
        || parsed
            .err_msg
            .map(|m| m.to_lowercase().contains("error"))
            .unwrap_or(false)
}

fn determine_deepgram_error_code(parsed: &DeepgramError) -> u16 {
    parsed
        .err_code
        .and_then(map_deepgram_err_code)
        .or_else(|| parsed.category.and_then(map_deepgram_category))
        .unwrap_or(500)
}

fn map_deepgram_err_code(code: &str) -> Option<u16> {
    match code {
        "Bad Request" => Some(400),
        "INVALID_AUTH" | "INSUFFICIENT_PERMISSIONS" => Some(401),
        "ASR_PAYMENT_REQUIRED" => Some(402),
        "TOO_MANY_REQUESTS" => Some(429),
        "PROJECT_NOT_FOUND" => Some(404),
        _ => None,
    }
}

fn map_deepgram_category(category: &str) -> Option<u16> {
    match category {
        "INVALID_JSON" => Some(400),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_soniox_error_numeric_code() {
        let data = br#"{"error_code": 400, "error_message": "Invalid model specified."}"#;
        let err = detect_upstream_error(data).unwrap();
        assert_eq!(err.code, 400);
        assert_eq!(err.message, "Invalid model specified.");
        assert_eq!(err.provider_code, Some("400".to_string()));
        assert_eq!(err.to_close_code(), 4400);
    }

    #[test]
    fn test_soniox_error_503() {
        let data = br#"{"error_code": 503, "error_message": "Cannot continue request (code 1). Please restart the request."}"#;
        let err = detect_upstream_error(data).unwrap();
        assert_eq!(err.code, 503);
        assert!(err.message.contains("Cannot continue request"));
        assert_eq!(err.to_close_code(), 4500);
    }

    #[test]
    fn test_deepgram_invalid_auth() {
        let data = br#"{"err_code": "INVALID_AUTH", "err_msg": "Invalid credentials.", "request_id": "uuid"}"#;
        let err = detect_upstream_error(data).unwrap();
        assert_eq!(err.code, 401);
        assert_eq!(err.message, "Invalid credentials.");
        assert_eq!(err.provider_code, Some("INVALID_AUTH".to_string()));
        assert_eq!(err.to_close_code(), 4401);
    }

    #[test]
    fn test_deepgram_bad_request() {
        let data = br#"{"err_code": "Bad Request", "err_msg": "Bad Request: failed to process audio: corrupt or unsupported data", "request_id": "uuid"}"#;
        let err = detect_upstream_error(data).unwrap();
        assert_eq!(err.code, 400);
        assert!(err.message.contains("failed to process audio"));
        assert_eq!(err.to_close_code(), 4400);
    }

    #[test]
    fn test_deepgram_invalid_json() {
        let data = br#"{"category": "INVALID_JSON", "message": "Invalid JSON submitted.", "details": "Json deserialize error"}"#;
        let err = detect_upstream_error(data).unwrap();
        assert_eq!(err.code, 400);
        assert_eq!(err.message, "Invalid JSON submitted.");
        assert_eq!(err.provider_code, Some("INVALID_JSON".to_string()));
    }

    #[test]
    fn test_deepgram_rate_limit() {
        let data = br#"{"err_code": "TOO_MANY_REQUESTS", "err_msg": "Too many requests. Please try again later", "request_id": "uuid"}"#;
        let err = detect_upstream_error(data).unwrap();
        assert_eq!(err.code, 429);
        assert_eq!(err.to_close_code(), 4429);
    }

    #[test]
    fn test_deepgram_payment_required() {
        let data = br#"{"err_code": "ASR_PAYMENT_REQUIRED", "err_msg": "Project does not have enough credits", "request_id": "uuid"}"#;
        let err = detect_upstream_error(data).unwrap();
        assert_eq!(err.code, 402);
        assert_eq!(err.to_close_code(), 4402);
    }

    #[test]
    fn test_non_error_message() {
        let data = br#"{"type": "Results", "channel_index": [0, 1], "duration": 1.0}"#;
        assert!(detect_upstream_error(data).is_none());
    }

    #[test]
    fn test_non_json() {
        let data = b"not json at all";
        assert!(detect_upstream_error(data).is_none());
    }

    #[test]
    fn test_binary_data() {
        let data = &[0x00, 0x01, 0x02, 0x03];
        assert!(detect_upstream_error(data).is_none());
    }

    #[test]
    fn test_empty_json() {
        let data = br#"{}"#;
        assert!(detect_upstream_error(data).is_none());
    }

    #[test]
    fn test_close_code_mapping() {
        let err = UpstreamError {
            code: 400,
            message: "test".to_string(),
            provider_code: None,
        };
        assert_eq!(err.to_close_code(), 4400);

        let err = UpstreamError {
            code: 500,
            message: "test".to_string(),
            provider_code: None,
        };
        assert_eq!(err.to_close_code(), 4500);

        let err = UpstreamError {
            code: 502,
            message: "test".to_string(),
            provider_code: None,
        };
        assert_eq!(err.to_close_code(), 4500);

        let err = UpstreamError {
            code: 999,
            message: "test".to_string(),
            provider_code: None,
        };
        assert_eq!(err.to_close_code(), 4000);
    }
}
