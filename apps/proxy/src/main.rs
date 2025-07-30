use axum::Router;
use hypr_aws_transcribe::TranscribeService;

async fn health() -> &'static str {
    "OK2"
}

#[tokio::main]
async fn main() {
    let transcribe_service = TranscribeService::mock();

    let app = Router::new()
        .route_service("/", transcribe_service)
        .route("/health", axum::routing::get(health));

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", 1234))
        .await
        .unwrap();

    axum::serve(listener, app).await.unwrap();
}
