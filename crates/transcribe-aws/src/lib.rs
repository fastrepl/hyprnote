mod error;
pub use error::*;

mod handler;
use handler::Handler;
pub use handler::{TranscribeConfig, WsMessage};

use axum::{
    body::Body,
    http::{Request, Response},
};
use hypr_transcribe_interface::BaseTranscribeService;

#[derive(Clone)]
pub struct TranscribeService(BaseTranscribeService<Handler>);

impl TranscribeService {
    pub async fn new(config: TranscribeConfig) -> Result<Self, Error> {
        let handler = Handler::new(config).await?;
        Ok(Self(BaseTranscribeService::new(handler)))
    }
}

impl tower::Service<Request<Body>> for TranscribeService {
    type Response = Response<Body>;
    type Error = std::convert::Infallible;
    type Future = <BaseTranscribeService<Handler> as tower::Service<Request<Body>>>::Future;

    fn poll_ready(
        &mut self,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        self.0.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        self.0.call(req)
    }
}
