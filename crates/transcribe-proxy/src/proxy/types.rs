use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::ws::WebSocket;
use futures_util::stream::{SplitSink, SplitStream};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};

pub const DEFAULT_CLOSE_CODE: u16 = 1011;
pub const UPSTREAM_CONNECT_TIMEOUT_MS: u64 = 5000;

pub type OnCloseCallback = Arc<dyn Fn(Duration) + Send + Sync>;
pub type ControlMessageTypes = Arc<HashSet<&'static str>>;
pub type FirstMessageTransformer = Arc<dyn Fn(String) -> String + Send + Sync>;

pub type UpstreamSender = SplitSink<
    WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
    tokio_tungstenite::tungstenite::Message,
>;
pub type UpstreamReceiver = SplitStream<WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>>;
pub type ClientSender = SplitSink<WebSocket, axum::extract::ws::Message>;
pub type ClientReceiver = SplitStream<WebSocket>;

pub fn is_control_message(data: &[u8], types: &HashSet<&str>) -> bool {
    if types.is_empty() {
        return false;
    }
    if let Ok(json) = serde_json::from_slice::<serde_json::Value>(data) {
        if let Some(msg_type) = json.get("type").and_then(|v| v.as_str()) {
            return types.contains(msg_type);
        }
    }
    false
}

pub fn normalize_close_code(code: u16) -> u16 {
    if code == 1005 || code == 1006 || code == 1015 || code >= 5000 {
        DEFAULT_CLOSE_CODE
    } else {
        code
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_control_message_empty_types() {
        let types = HashSet::new();
        let data = br#"{"type": "KeepAlive"}"#;
        assert!(!is_control_message(data, &types));
    }

    #[test]
    fn test_is_control_message_matching_type() {
        let mut types = HashSet::new();
        types.insert("KeepAlive");
        types.insert("CloseStream");

        let data = br#"{"type": "KeepAlive"}"#;
        assert!(is_control_message(data, &types));

        let data = br#"{"type": "CloseStream"}"#;
        assert!(is_control_message(data, &types));
    }

    #[test]
    fn test_is_control_message_non_matching_type() {
        let mut types = HashSet::new();
        types.insert("KeepAlive");

        let data = br#"{"type": "DataMessage"}"#;
        assert!(!is_control_message(data, &types));
    }

    #[test]
    fn test_is_control_message_invalid_json() {
        let mut types = HashSet::new();
        types.insert("KeepAlive");

        let data = b"not json";
        assert!(!is_control_message(data, &types));
    }

    #[test]
    fn test_is_control_message_no_type_field() {
        let mut types = HashSet::new();
        types.insert("KeepAlive");

        let data = br#"{"message": "hello"}"#;
        assert!(!is_control_message(data, &types));
    }

    #[test]
    fn test_is_control_message_type_not_string() {
        let mut types = HashSet::new();
        types.insert("KeepAlive");

        let data = br#"{"type": 123}"#;
        assert!(!is_control_message(data, &types));
    }

    #[test]
    fn test_normalize_close_code_valid_codes() {
        assert_eq!(normalize_close_code(1000), 1000);
        assert_eq!(normalize_close_code(1001), 1001);
        assert_eq!(normalize_close_code(1002), 1002);
        assert_eq!(normalize_close_code(1003), 1003);
        assert_eq!(normalize_close_code(4999), 4999);
    }

    #[test]
    fn test_normalize_close_code_reserved_codes() {
        assert_eq!(normalize_close_code(1005), DEFAULT_CLOSE_CODE);
        assert_eq!(normalize_close_code(1006), DEFAULT_CLOSE_CODE);
        assert_eq!(normalize_close_code(1015), DEFAULT_CLOSE_CODE);
    }

    #[test]
    fn test_normalize_close_code_high_codes() {
        assert_eq!(normalize_close_code(5000), DEFAULT_CLOSE_CODE);
        assert_eq!(normalize_close_code(5001), DEFAULT_CLOSE_CODE);
        assert_eq!(normalize_close_code(9999), DEFAULT_CLOSE_CODE);
    }
}
