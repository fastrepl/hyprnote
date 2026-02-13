use hypr_restate_rate_limit::{RateLimiter, RateLimiterImpl};
use hypr_restate_stt::{Config, StorageCleanup, StorageCleanupImpl, SttFile, SttFileImpl};
use restate_sdk::endpoint::Endpoint;
use restate_sdk::http_server::HttpServer;

mod env;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let env = env::env();

    let config: &'static Config = Box::leak(Box::new(Config {
        restate_ingress_url: env.restate_ingress_url.clone(),
        soniox_api_key: env.soniox_api_key.clone(),
        supabase_url: env.supabase_url.clone(),
        supabase_service_role_key: env.supabase_service_role_key.clone(),
    }));

    let mut builder = Endpoint::builder()
        .bind(SttFileImpl::new(config).serve())
        .bind(RateLimiterImpl.serve())
        .bind(StorageCleanupImpl::new(config).serve());

    if let Some(key) = &env.restate_identity_key {
        builder = builder.identity_key(key).expect("invalid identity key");
    }

    let addr = format!("0.0.0.0:{}", env.port);
    tracing::info!(addr = %addr, "server listening");

    HttpServer::new(builder.build())
        .listen_and_serve(addr.parse().unwrap())
        .await;
}
