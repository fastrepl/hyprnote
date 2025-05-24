use std::sync::{Arc, Mutex};
use tokio_util::sync::CancellationToken;

#[derive(Clone)]
pub struct ConnectionManager {
    inner: Arc<Mutex<Option<CancellationToken>>>,
}

impl Default for ConnectionManager {
    fn default() -> Self {
        Self {
            inner: Arc::new(Mutex::new(None)),
        }
    }
}

impl ConnectionManager {
    pub fn acquire_connection(&self) -> ConnectionGuard {
        let mut slot = self.inner.lock().unwrap();

        if let Some(old) = slot.take() {
            old.cancel();
        }

        let token = CancellationToken::new();
        *slot = Some(token.clone());

        ConnectionGuard { token }
    }
}

pub struct ConnectionGuard {
    token: CancellationToken,
}

impl ConnectionGuard {
    pub async fn cancelled(&self) {
        self.token.cancelled().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        extract::{
            ws::{Message, WebSocket},
            State as AxumState, WebSocketUpgrade,
        },
        http::StatusCode,
        response::IntoResponse,
        routing::get,
        Router,
    };
    use futures_util::{SinkExt, StreamExt};
    use std::{
        future::IntoFuture,
        net::{Ipv4Addr, SocketAddr},
    };
    use tokio_tungstenite::{connect_async, tungstenite::protocol::Message as TungsteniteMessage};

    fn app() -> Router {
        let manager = ConnectionManager::default();
        Router::new().route("/ws", get(handler)).with_state(manager)
    }

    async fn handler(
        ws: WebSocketUpgrade,
        AxumState(manager): AxumState<ConnectionManager>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let guard = manager.acquire_connection();

        Ok(ws.on_upgrade(move |socket| handle_socket(socket, guard)))
    }

    async fn handle_socket(socket: WebSocket, _guard: ConnectionGuard) {
        let (mut sink, mut stream) = socket.split();

        while let Some(Ok(msg)) = stream.next().await {
            if let Ok(msg) = msg.to_text() {
                sink.send(Message::Text(msg.into())).await.unwrap();
            }
        }
    }

    #[tokio::test]
    async fn integration_test() {
        let addr = {
            let listener =
                tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::UNSPECIFIED, 0)))
                    .await
                    .unwrap();
            let addr = listener.local_addr().unwrap();
            tokio::spawn(axum::serve(listener, app()).into_future());
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            addr
        };

        let socket_1 = {
            let (mut socket, _response) = connect_async(format!("ws://{}/ws", addr)).await.unwrap();

            socket
                .send(TungsteniteMessage::Text("test message 1".into()))
                .await
                .unwrap();

            let msg = socket.next().await.unwrap().unwrap();
            assert_eq!(msg.to_text().unwrap(), "test message 1");

            socket
        };

        {
            let result = connect_async(format!("ws://{}/ws", addr)).await;
            assert!(result.is_err());

            if let Err(tokio_tungstenite::tungstenite::Error::Http(response)) = result {
                assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
                assert_eq!(response.status().as_u16(), 429);
            } else {
                panic!("{:?}", result);
            }
        }

        drop(socket_1);

        {
            let result = connect_async(format!("ws://{}/ws", addr)).await;
            assert!(result.is_ok());
        }
    }
}
