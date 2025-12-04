use futures_util::{pin_mut, SinkExt, Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tokio_tungstenite::{
    accept_async,
    tungstenite::{protocol::Message, ClientRequestBuilder},
};
use ws::client::{DecodeError, WebSocketClient, WebSocketIO};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct TestMessage {
    text: String,
    count: u32,
}

struct TestIO;

impl WebSocketIO for TestIO {
    type Data = TestMessage;
    type Input = TestMessage;
    type Output = TestMessage;

    fn to_input(data: Self::Data) -> Self::Input {
        data
    }

    fn to_message(input: Self::Input) -> Message {
        Message::Text(serde_json::to_string(&input).unwrap().into())
    }

    fn decode(msg: Message) -> Result<Self::Output, DecodeError> {
        match msg {
            Message::Text(text) => {
                serde_json::from_str(&text).map_err(DecodeError::DeserializationError)
            }
            _ => Err(DecodeError::UnsupportedType),
        }
    }
}

async fn echo_server() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            tokio::spawn(async move {
                let ws_stream = accept_async(stream).await.unwrap();
                let (mut tx, mut rx) = ws_stream.split();
                while let Some(Ok(msg)) = rx.next().await {
                    match msg {
                        Message::Text(_) | Message::Binary(_) => {
                            if tx.send(msg).await.is_err() {
                                break;
                            }
                        }
                        Message::Close(_) => break,
                        _ => {}
                    }
                }
            });
        }
    });

    addr
}

async fn collect_messages<T: WebSocketIO>(
    output: impl Stream<Item = Result<T::Output, ws::Error>>,
    max: usize,
) -> Vec<T::Output> {
    pin_mut!(output);
    let mut results = Vec::new();
    while let Some(Ok(msg)) = output.next().await {
        results.push(msg);
        if results.len() >= max {
            break;
        }
    }
    results
}

#[tokio::test]
async fn test_basic_echo() {
    let addr = echo_server().await;
    let client = WebSocketClient::new(ClientRequestBuilder::new(
        format!("ws://{}", addr).parse().unwrap(),
    ));

    let messages = vec![
        TestMessage {
            text: "hello".to_string(),
            count: 1,
        },
        TestMessage {
            text: "world".to_string(),
            count: 2,
        },
    ];

    let stream = futures_util::stream::iter(messages.clone());
    let (output, _handle, _send_task) = client.from_audio::<TestIO>(None, stream).await.unwrap();

    let received = collect_messages::<TestIO>(output, 2).await;
    assert_eq!(received, messages);
}

#[tokio::test]
async fn test_finalize() {
    let addr = echo_server().await;
    let client = WebSocketClient::new(ClientRequestBuilder::new(
        format!("ws://{}", addr).parse().unwrap(),
    ));

    let stream = futures_util::stream::iter(vec![TestMessage {
        text: "initial".to_string(),
        count: 1,
    }]);
    let (output, handle, _send_task) = client.from_audio::<TestIO>(None, stream).await.unwrap();

    let final_msg = TestMessage {
        text: "final".to_string(),
        count: 999,
    };
    handle
        .finalize_with_text(serde_json::to_string(&final_msg).unwrap().into())
        .await;

    let received = collect_messages::<TestIO>(output, 2).await;
    assert_eq!(received.len(), 2);
    assert_eq!(received[1], final_msg);
}

#[tokio::test]
async fn test_keep_alive() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let ws_stream = accept_async(stream).await.unwrap();
        let (mut tx, mut rx) = ws_stream.split();

        let mut ping_count = 0;
        while let Some(Ok(msg)) = rx.next().await {
            if matches!(msg, Message::Ping(_)) {
                ping_count += 1;
                if ping_count >= 2 {
                    let response = TestMessage {
                        text: "done".to_string(),
                        count: ping_count,
                    };
                    tx.send(Message::Text(
                        serde_json::to_string(&response).unwrap().into(),
                    ))
                    .await
                    .unwrap();
                    break;
                }
            }
        }
    });

    let client = WebSocketClient::new(ClientRequestBuilder::new(
        format!("ws://{}", addr).parse().unwrap(),
    ))
    .with_keep_alive_message(
        std::time::Duration::from_millis(100),
        Message::Ping(vec![].into()),
    );

    let stream = futures_util::stream::pending::<TestMessage>();
    let (output, _handle, _send_task) = client.from_audio::<TestIO>(None, stream).await.unwrap();

    let received = collect_messages::<TestIO>(output, 1).await;
    assert_eq!(received[0].text, "done");
    assert!(received[0].count >= 2);
}

#[tokio::test]
async fn test_retry() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    let attempt_count = std::sync::Arc::new(std::sync::atomic::AtomicU32::new(0));
    let attempt_count_clone = attempt_count.clone();

    tokio::spawn(async move {
        loop {
            if let Ok((stream, _)) = listener.accept().await {
                let current = attempt_count_clone.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                if current == 0 {
                    drop(stream);
                    continue;
                }
                let ws_stream = accept_async(stream).await.unwrap();
                let (mut tx, mut rx) = ws_stream.split();
                while let Some(Ok(msg)) = rx.next().await {
                    if matches!(msg, Message::Text(_) | Message::Binary(_)) {
                        if tx.send(msg).await.is_err() {
                            break;
                        }
                    }
                }
                break;
            }
        }
    });

    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    let client = WebSocketClient::new(ClientRequestBuilder::new(
        format!("ws://{}", addr).parse().unwrap(),
    ));

    let stream = futures_util::stream::iter(vec![TestMessage {
        text: "retry_test".to_string(),
        count: 1,
    }]);
    let (output, _handle, _send_task) = client.from_audio::<TestIO>(None, stream).await.unwrap();

    let received = collect_messages::<TestIO>(output, 1).await;
    assert_eq!(received[0].text, "retry_test");
    assert!(attempt_count.load(std::sync::atomic::Ordering::SeqCst) >= 2);
}
