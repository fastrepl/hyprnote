use axum::Router;

async fn health() -> &'static str {
    "OK2"
}

#[tokio::main]
async fn main() {
    let aws_service = hypr_transcribe_aws::TranscribeService::new(
        hypr_transcribe_aws::TranscribeConfig::default(),
    )
    .await
    .unwrap();

    let stt_router = Router::new().route_service("/aws", aws_service);

    let app = Router::new()
        .route("/health", axum::routing::get(health))
        .merge(stt_router);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", 1234))
        .await
        .unwrap();

    axum::serve(listener, app).await.unwrap();
}
