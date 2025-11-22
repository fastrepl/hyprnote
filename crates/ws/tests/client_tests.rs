use futures_util::{pin_mut, SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{
    accept_async,
    tungstenite::{protocol::Message, ClientRequestBuilder},
};
use ws::client::{WebSocketClient, WebSocketIO};

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

    fn from_message(msg: Message) -> Option<Self::Output> {
        match msg {
            Message::Text(text) => serde_json::from_str(&text).ok(),
            _ => None,
        }
    }
}

struct BinaryIO;

impl WebSocketIO for BinaryIO {
    type Data = Vec<u8>;
    type Input = Vec<u8>;
    type Output = Vec<u8>;

    fn to_input(data: Self::Data) -> Self::Input {
        data
    }

    fn to_message(input: Self::Input) -> Message {
        Message::Binary(input.into())
    }

    fn from_message(msg: Message) -> Option<Self::Output> {
        match msg {
            Message::Binary(data) => Some(data.to_vec()),
            _ => None,
        }
    }
}

async fn setup_echo_server() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            tokio::spawn(handle_connection(stream));
        }
    });

    addr
}

async fn handle_connection(stream: TcpStream) {
    let ws_stream = accept_async(stream).await.unwrap();
    let (mut sender, mut receiver) = ws_stream.split();

    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(_) | Message::Binary(_) => {
                if sender.send(msg).await.is_err() {
                    break;
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }
}

async fn setup_counting_server() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            tokio::spawn(handle_counting_connection(stream));
        }
    });

    addr
}

async fn handle_counting_connection(stream: TcpStream) {
    let ws_stream = accept_async(stream).await.unwrap();
    let (mut sender, mut receiver) = ws_stream.split();
    let mut count = 0u32;

    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Text(_) | Message::Binary(_) => {
                let response = TestMessage {
                    text: format!("response_{}", count),
                    count,
                };
                count += 1;
                if sender
                    .send(Message::Text(
                        serde_json::to_string(&response).unwrap().into(),
                    ))
                    .await
                    .is_err()
                {
                    break;
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }
}

#[tokio::test]
async fn test_basic_connection_and_echo() {
    let addr = setup_echo_server().await;
    let url = format!("ws://{}", addr);

    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

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
    let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    let mut received = Vec::new();
    while let Some(Ok(msg)) = output.next().await {
        received.push(msg);
        if received.len() == messages.len() {
            break;
        }
    }

    assert_eq!(received, messages);
}

#[tokio::test]
async fn test_binary_messages() {
    let addr = setup_echo_server().await;
    let url = format!("ws://{}", addr);

    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

    let messages = vec![vec![1, 2, 3, 4, 5], vec![10, 20, 30], vec![255, 254, 253]];

    let stream = futures_util::stream::iter(messages.clone());
    let (output, _handle) = client.from_audio::<BinaryIO>(stream).await.unwrap();
    pin_mut!(output);

    let mut received = Vec::new();
    while let Some(Ok(msg)) = output.next().await {
        received.push(msg);
        if received.len() == messages.len() {
            break;
        }
    }

    assert_eq!(received, messages);
}

#[tokio::test]
async fn test_multiple_messages() {
    let addr = setup_counting_server().await;
    let url = format!("ws://{}", addr);

    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

    let send_count = 10;
    let messages: Vec<TestMessage> = (0..send_count)
        .map(|i| TestMessage {
            text: format!("message_{}", i),
            count: i,
        })
        .collect();

    let stream = futures_util::stream::iter(messages);
    let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    let mut received = Vec::new();
    while let Some(Ok(msg)) = output.next().await {
        received.push(msg);
        if received.len() == send_count as usize {
            break;
        }
    }

    assert_eq!(received.len(), send_count as usize);
    for (i, msg) in received.iter().enumerate() {
        assert_eq!(msg.count, i as u32);
        assert_eq!(msg.text, format!("response_{}", i));
    }
}

#[tokio::test]
async fn test_finalize_with_text() {
    let addr = setup_echo_server().await;
    let url = format!("ws://{}", addr);

    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

    let messages = vec![TestMessage {
        text: "initial".to_string(),
        count: 1,
    }];

    let stream = futures_util::stream::iter(messages);
    let (output, handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    let final_message = TestMessage {
        text: "final".to_string(),
        count: 999,
    };
    handle
        .finalize_with_text(serde_json::to_string(&final_message).unwrap().into())
        .await;

    let mut received = Vec::new();
    while let Some(Ok(msg)) = output.next().await {
        received.push(msg);
        if received.len() == 2 {
            break;
        }
    }

    assert_eq!(received.len(), 2);
    assert_eq!(received[1].text, "final");
    assert_eq!(received[1].count, 999);
}

#[tokio::test]
async fn test_keep_alive() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let ws_stream = accept_async(stream).await.unwrap();
        let (mut sender, mut receiver) = ws_stream.split();

        let mut ping_count = 0;
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Ping(_) => {
                    ping_count += 1;
                    if ping_count >= 2 {
                        let response = TestMessage {
                            text: "done".to_string(),
                            count: ping_count,
                        };
                        sender
                            .send(Message::Text(
                                serde_json::to_string(&response).unwrap().into(),
                            ))
                            .await
                            .unwrap();
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    let url = format!("ws://{}", addr);
    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()))
        .with_keep_alive_message(
            std::time::Duration::from_millis(100),
            Message::Ping(vec![].into()),
        );

    let stream = futures_util::stream::pending::<TestMessage>();
    let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    if let Some(Ok(msg)) = output.next().await {
        assert_eq!(msg.text, "done");
        assert!(msg.count >= 2);
    } else {
        panic!("Expected to receive a message");
    }
}

#[tokio::test]
async fn test_connection_retry() {
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
                let (mut sender, mut receiver) = ws_stream.split();
                while let Some(Ok(msg)) = receiver.next().await {
                    match msg {
                        Message::Text(_) | Message::Binary(_) => {
                            if sender.send(msg).await.is_err() {
                                break;
                            }
                        }
                        Message::Close(_) => break,
                        _ => {}
                    }
                }
                break;
            }
        }
    });

    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    let url = format!("ws://{}", addr);
    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

    let messages = vec![TestMessage {
        text: "retry_test".to_string(),
        count: 1,
    }];

    let stream = futures_util::stream::iter(messages.clone());
    let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    if let Some(Ok(msg)) = output.next().await {
        assert_eq!(msg, messages[0]);
    } else {
        panic!("Expected to receive a message after retry");
    }

    assert!(attempt_count.load(std::sync::atomic::Ordering::SeqCst) >= 2);
}

#[tokio::test]
async fn test_stream_ends_gracefully() {
    let addr = setup_echo_server().await;
    let url = format!("ws://{}", addr);

    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

    let messages = vec![
        TestMessage {
            text: "msg1".to_string(),
            count: 1,
        },
        TestMessage {
            text: "msg2".to_string(),
            count: 2,
        },
    ];

    let stream = futures_util::stream::iter(messages.clone());
    let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    let mut received = Vec::new();
    let timeout_duration = std::time::Duration::from_secs(10);
    let start = tokio::time::Instant::now();

    while start.elapsed() < timeout_duration {
        match tokio::time::timeout(std::time::Duration::from_secs(1), output.next()).await {
            Ok(Some(result)) => match result {
                Ok(msg) => received.push(msg),
                Err(_) => break,
            },
            Ok(None) => break,
            Err(_) => {
                if received.len() >= messages.len() {
                    break;
                }
            }
        }
    }

    assert_eq!(received.len(), messages.len());
}

#[tokio::test]
async fn test_empty_stream() {
    let addr = setup_echo_server().await;
    let url = format!("ws://{}", addr);

    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

    let stream = futures_util::stream::iter(Vec::<TestMessage>::new());
    let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    tokio::time::timeout(std::time::Duration::from_millis(500), output.next())
        .await
        .ok();
}

#[tokio::test]
async fn test_concurrent_clients() {
    let addr = setup_echo_server().await;
    let url = format!("ws://{}", addr);

    let mut handles = vec![];

    for i in 0..5 {
        let url = url.clone();
        let handle = tokio::spawn(async move {
            let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

            let messages = vec![TestMessage {
                text: format!("client_{}", i),
                count: i,
            }];

            let stream = futures_util::stream::iter(messages.clone());
            let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
            pin_mut!(output);

            if let Some(Ok(msg)) = output.next().await {
                assert_eq!(msg, messages[0]);
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.await.unwrap();
    }
}

#[tokio::test]
async fn test_large_message() {
    let addr = setup_echo_server().await;
    let url = format!("ws://{}", addr);

    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

    let large_text = "x".repeat(1024 * 64);
    let messages = vec![TestMessage {
        text: large_text.clone(),
        count: 1,
    }];

    let stream = futures_util::stream::iter(messages.clone());
    let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    if let Some(Ok(msg)) = output.next().await {
        assert_eq!(msg, messages[0]);
    }
}

#[tokio::test]
async fn test_rapid_messages() {
    let addr = setup_counting_server().await;
    let url = format!("ws://{}", addr);

    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

    let message_count = 100;
    let messages: Vec<TestMessage> = (0..message_count)
        .map(|i| TestMessage {
            text: format!("rapid_{}", i),
            count: i,
        })
        .collect();

    let stream = futures_util::stream::iter(messages);
    let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    let mut received = Vec::new();
    while let Some(Ok(msg)) = output.next().await {
        received.push(msg);
        if received.len() == message_count as usize {
            break;
        }
    }

    assert_eq!(received.len(), message_count as usize);
}

#[tokio::test]
async fn test_server_closes_connection() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let ws_stream = accept_async(stream).await.unwrap();
        let (mut sender, mut receiver) = ws_stream.split();

        if let Some(Ok(msg)) = receiver.next().await {
            sender.send(msg).await.unwrap();
            sender.send(Message::Close(None)).await.unwrap();
        }
    });

    let url = format!("ws://{}", addr);
    let client = WebSocketClient::new(ClientRequestBuilder::new(url.parse().unwrap()));

    let messages = vec![
        TestMessage {
            text: "before_close".to_string(),
            count: 1,
        },
        TestMessage {
            text: "after_close".to_string(),
            count: 2,
        },
    ];

    let stream = futures_util::stream::iter(messages);
    let (output, _handle) = client.from_audio::<TestIO>(stream).await.unwrap();
    pin_mut!(output);

    let mut received = Vec::new();
    while let Some(result) = output.next().await {
        match result {
            Ok(msg) => received.push(msg),
            Err(_) => break,
        }
    }

    assert_eq!(received.len(), 1);
    assert_eq!(received[0].text, "before_close");
}
