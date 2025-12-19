use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;

pub use tokio_tungstenite::tungstenite::ClientRequestBuilder;

use super::handler::WebSocketProxy;
use super::types::{FirstMessageTransformer, OnCloseCallback};
use crate::config::DEFAULT_CONNECT_TIMEOUT_MS;

pub struct NoUpstream;
pub struct WithUrl {
    url: String,
    headers: HashMap<String, String>,
}

pub struct WebSocketProxyBuilder<S = NoUpstream> {
    state: S,
    control_message_types: HashSet<&'static str>,
    transform_first_message: Option<FirstMessageTransformer>,
    connect_timeout: Duration,
    on_close: Option<OnCloseCallback>,
}

impl Default for WebSocketProxyBuilder<NoUpstream> {
    fn default() -> Self {
        Self {
            state: NoUpstream,
            control_message_types: HashSet::new(),
            transform_first_message: None,
            connect_timeout: Duration::from_millis(DEFAULT_CONNECT_TIMEOUT_MS),
            on_close: None,
        }
    }
}

impl<S> WebSocketProxyBuilder<S> {
    fn with_state<T>(self, state: T) -> WebSocketProxyBuilder<T> {
        WebSocketProxyBuilder {
            state,
            control_message_types: self.control_message_types,
            transform_first_message: self.transform_first_message,
            connect_timeout: self.connect_timeout,
            on_close: self.on_close,
        }
    }

    fn build_from(
        request: ClientRequestBuilder,
        control_message_types: HashSet<&'static str>,
        transform_first_message: Option<FirstMessageTransformer>,
        connect_timeout: Duration,
        on_close: Option<OnCloseCallback>,
    ) -> WebSocketProxy {
        let control_message_types = if control_message_types.is_empty() {
            None
        } else {
            Some(Arc::new(control_message_types))
        };

        WebSocketProxy::new(
            request,
            control_message_types,
            transform_first_message,
            connect_timeout,
            on_close,
        )
    }

    pub fn control_message_types(mut self, types: &[&'static str]) -> Self {
        self.control_message_types = types.iter().copied().collect();
        self
    }

    pub fn transform_first_message<F>(mut self, transformer: F) -> Self
    where
        F: Fn(String) -> String + Send + Sync + 'static,
    {
        self.transform_first_message = Some(Arc::new(transformer));
        self
    }

    pub fn connect_timeout(mut self, timeout: Duration) -> Self {
        self.connect_timeout = timeout;
        self
    }

    pub fn on_close<F, Fut>(mut self, callback: F) -> Self
    where
        F: Fn(Duration) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = ()> + Send + 'static,
    {
        self.on_close = Some(Arc::new(move |duration| {
            Box::pin(callback(duration))
                as std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>>
        }));
        self
    }
}

impl WebSocketProxyBuilder<NoUpstream> {
    pub fn upstream_url(self, url: impl Into<String>) -> WebSocketProxyBuilder<WithUrl> {
        self.with_state(WithUrl {
            url: url.into(),
            headers: HashMap::new(),
        })
    }
}

impl WebSocketProxyBuilder<WithUrl> {
    pub fn header(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.state.headers.insert(key.into(), value.into());
        self
    }

    pub fn headers(mut self, new_headers: HashMap<String, String>) -> Self {
        self.state.headers.extend(new_headers);
        self
    }

    pub fn build(self) -> WebSocketProxy {
        let mut request =
            ClientRequestBuilder::new(self.state.url.parse().expect("invalid upstream URL"));
        for (key, value) in self.state.headers {
            request = request.with_header(&key, &value);
        }
        Self::build_from(
            request,
            self.control_message_types,
            self.transform_first_message,
            self.connect_timeout,
            self.on_close,
        )
    }
}
