use std::collections::HashSet;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::ws::WebSocket;
use futures_util::stream::{SplitSink, SplitStream};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};

pub const DEFAULT_CLOSE_CODE: u16 = 1011;

pub type OnCloseCallback =
    Arc<dyn Fn(Duration) -> Pin<Box<dyn Future<Output = ()> + Send>> + Send + Sync>;
pub type ControlMessageTypes = Arc<HashSet<&'static str>>;
pub type FirstMessageTransformer = Arc<dyn Fn(String) -> String + Send + Sync>;

pub type UpstreamSender = SplitSink<
    WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
    tokio_tungstenite::tungstenite::Message,
>;
pub type UpstreamReceiver = SplitStream<WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>>;
pub type ClientSender = SplitSink<WebSocket, axum::extract::ws::Message>;
pub type ClientReceiver = SplitStream<WebSocket>;

#[derive(serde::Deserialize)]
struct TypeOnly<'a> {
    #[serde(borrow, rename = "type")]
    msg_type: Option<&'a str>,
}

pub fn is_control_message(data: &[u8], types: &HashSet<&str>) -> bool {
    if types.is_empty() {
        return false;
    }
    if let Ok(parsed) = serde_json::from_slice::<TypeOnly>(data) {
        if let Some(msg_type) = parsed.msg_type {
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

pub mod convert {
    use super::{DEFAULT_CLOSE_CODE, normalize_close_code};
    use axum::extract::ws::{CloseFrame as AxumCloseFrame, Message as AxumMessage};
    use tokio_tungstenite::tungstenite::{
        Message as TungsteniteMessage,
        protocol::{CloseFrame as TungsteniteCloseFrame, frame::coding::CloseCode},
    };

    pub fn extract_axum_close(
        frame: Option<AxumCloseFrame>,
        default_reason: &str,
    ) -> (u16, String) {
        match frame {
            Some(f) => (normalize_close_code(f.code), f.reason.to_string()),
            None => (DEFAULT_CLOSE_CODE, default_reason.to_string()),
        }
    }

    pub fn extract_tungstenite_close(
        frame: Option<TungsteniteCloseFrame>,
        default_reason: &str,
    ) -> (u16, String) {
        match frame {
            Some(f) => (normalize_close_code(f.code.into()), f.reason.to_string()),
            None => (DEFAULT_CLOSE_CODE, default_reason.to_string()),
        }
    }

    pub fn to_axum_close(code: u16, reason: String) -> AxumMessage {
        AxumMessage::Close(Some(AxumCloseFrame {
            code,
            reason: reason.into(),
        }))
    }

    pub fn to_tungstenite_close(code: u16, reason: String) -> TungsteniteMessage {
        TungsteniteMessage::Close(Some(TungsteniteCloseFrame {
            code: CloseCode::from(code),
            reason: reason.into(),
        }))
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
