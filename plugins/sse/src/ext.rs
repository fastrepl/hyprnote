use std::{collections::HashMap, future::Future};

use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderName};

use crate::{Request, Response, ServerSentEvent};
use tauri_specta::Event;

pub trait ServerSentEventPluginExt<R: tauri::Runtime> {
    fn fetch(&self, req: Request) -> impl Future<Output = Result<Response, String>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ServerSentEventPluginExt<R> for T {
    async fn fetch(&self, req: Request) -> Result<Response, String> {
        let app = self.app_handle().clone();
        let state = self.state::<crate::State>();

        let request_id = state
            .counter
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst);

        let method = req
            .method
            .parse::<reqwest::Method>()
            .map_err(|e| e.to_string())?;

        let mut headers = HeaderMap::new();
        for (key, value) in &req.headers {
            headers.insert(key.parse::<HeaderName>().unwrap(), value.parse().unwrap());
        }

        let mut request = state.client.request(
            method.clone(),
            req.url.parse::<reqwest::Url>().map_err(|e| e.to_string())?,
        );

        if method == reqwest::Method::POST
            || method == reqwest::Method::PUT
            || method == reqwest::Method::PATCH
        {
            let body = bytes::Bytes::from(req.body);
            request = request.body(body);
        }

        tracing::info!("plugin_sse_request_sent");
        let response_future = request.send();

        let res = response_future.await;
        tracing::info!("plugin_sse_response_received");

        match res {
            Ok(res) => {
                let mut headers = HashMap::new();
                for (name, value) in res.headers() {
                    headers.insert(
                        name.as_str().to_string(),
                        std::str::from_utf8(value.as_bytes()).unwrap().to_string(),
                    );
                }

                let status = res.status().as_u16();

                tauri::async_runtime::spawn(async move {
                    let mut stream = res.bytes_stream();

                    while let Some(chunk) = stream.next().await {
                        if let Ok(bytes) = chunk {
                            let event = ServerSentEvent {
                                request_id,
                                chunk: Some(bytes.to_vec()),
                            };

                            let _ = event.emit(&app);
                        }
                    }
                });

                Ok(Response {
                    request_id,
                    status,
                    headers,
                })
            }
            Err(_e) => Ok(Response {
                request_id,
                status: 599,
                headers: HashMap::new(),
            }),
        }
    }
}
