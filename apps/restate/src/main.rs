use restate_sdk::endpoint::Endpoint;
use restate_sdk::http_server::HttpServer;

mod env;
mod services;
mod soniox;
mod supabase;

use services::rate_limit::RateLimiter;
use services::storage_cleanup::StorageCleanup;
use services::stt_file::SttFile;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let env = env::env();

    let mut builder = Endpoint::builder()
        .bind(services::SttFileImpl::new(env).serve())
        .bind(services::RateLimiterImpl.serve())
        .bind(services::StorageCleanupImpl::new(env).serve());

    if let Some(key) = &env.restate_identity_key {
        builder = builder.identity_key(key).expect("invalid identity key");
    }

    let addr = format!("0.0.0.0:{}", env.port);
    tracing::info!(addr = %addr, "server listening");

    HttpServer::new(builder.build())
        .listen_and_serve(addr.parse().unwrap())
        .await;
}
