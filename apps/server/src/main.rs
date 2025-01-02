use std::time::Duration;

use axum::{
    extract::FromRef,
    http::StatusCode,
    middleware,
    routing::{get, post},
    Router,
};
use tower_http::{
    services::{ServeDir, ServeFile},
    timeout::TimeoutLayer,
};

use clerk_rs::{
    clerk::Clerk,
    validators::{axum::ClerkLayer, jwks::MemoryCacheJwksProvider},
    ClerkConfiguration,
};

use state::{AnalyticsState, AuthState};

mod analytics;
mod auth;
mod native;
mod state;
mod stripe;
mod web;

fn main() {
    #[cfg(debug_assertions)]
    dotenv::dotenv().unwrap();

    let _guard = sentry::init((
        std::env::var("SENTRY_DSN").unwrap(),
        sentry::ClientOptions {
            release: sentry::release_name!(),
            ..Default::default()
        },
    ));

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let turso = hypr_turso::TursoClient::new(std::env::var("TURSO_API_KEY").unwrap());

            let clerk_config = ClerkConfiguration::new(
                None,
                None,
                Some(std::env::var("CLERK_SECRET_KEY").unwrap()),
                None,
            );
            let clerk = Clerk::new(clerk_config);

            let stt_config = hypr_stt::Config {
                deepgram_api_key: std::env::var("DEEPGRAM_API_KEY").unwrap(),
                clova_api_key: std::env::var("CLOVA_API_KEY").unwrap(),
            };
            let stt = hypr_stt::Client::new(stt_config);

            let admin_db_conn = {
                #[cfg(debug_assertions)]
                let conn = hypr_db::ConnectionBuilder::new()
                    .local(":memory:")
                    .connect()
                    .await
                    .unwrap();

                #[cfg(not(debug_assertions))]
                let conn = hypr_db::ConnectionBuilder::new()
                    .remote(
                        std::env::var("DATABASE_URL").unwrap(),
                        std::env::var("DATABASE_TOKEN").unwrap(),
                    )
                    .connect()
                    .await
                    .unwrap();

                hypr_db::migrate(&conn, hypr_db::admin::migrations::v0())
                    .await
                    .unwrap();

                conn
            };

            let state = state::AppState {
                reqwest: reqwest::Client::new(),
                clerk: clerk.clone(),
                stt,
                turso,
                admin_db: hypr_db::admin::AdminDatabase::from(admin_db_conn).await,
                analytics: hypr_analytics::AnalyticsClient::new(
                    std::env::var("POSTHOG_API_KEY").unwrap(),
                ),
            };

            let web_router = Router::new()
                .route("/connect", post(web::connect::handler))
                .layer(ClerkLayer::new(
                    MemoryCacheJwksProvider::new(clerk),
                    None,
                    true,
                ));

            let native_router = Router::new()
                .route(
                    "/enhance",
                    post(native::enhance::handler)
                        .layer(TimeoutLayer::new(Duration::from_secs(20))),
                )
                .route(
                    "/chat/completions",
                    post(native::openai::handler).layer(TimeoutLayer::new(Duration::from_secs(10))),
                )
                .route("/transcribe", get(native::transcribe::handler))
                .layer(
                    tower::builder::ServiceBuilder::new()
                        .layer(middleware::from_fn_with_state(
                            AuthState::from_ref(&state),
                            auth::middleware_fn,
                        ))
                        .layer(middleware::from_fn_with_state(
                            AnalyticsState::from_ref(&state),
                            analytics::middleware_fn,
                        )),
                );

            let webhook_router = Router::new().route("/stripe", post(stripe::webhook::handler));

            let router = Router::new()
                .route("/health", get(|| async { (StatusCode::OK, "OK") }))
                .nest("/api/native", native_router)
                .nest("/api/web", web_router)
                .nest("/webhook", webhook_router)
                .fallback_service({
                    let web_dir =
                        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web");

                    ServeDir::new(web_dir.join("dist"))
                        .append_index_html_on_directories(false)
                        .fallback(ServeFile::new(web_dir.join("dist/index.html")))
                })
                .with_state(state);

            let port = std::env::var("PORT").unwrap_or("3000".to_string());
            let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
                .await
                .unwrap();
            axum::serve(listener, router).await.unwrap();
        });
}
