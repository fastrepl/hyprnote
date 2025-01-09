use std::{
    io::{Error, ErrorKind},
    time::Duration,
};

use axum::{
    http::StatusCode,
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

mod analytics;
mod auth;
mod native;
mod state;
mod stripe;
mod web;
mod worker;

fn main() {
    #[cfg(debug_assertions)]
    dotenv::from_filename(".env.local").unwrap();

    #[cfg(debug_assertions)]
    export_ts_types().unwrap();

    let _guard = sentry::init((
        std::env::var("SENTRY_DSN").unwrap(),
        sentry::ClientOptions {
            release: sentry::release_name!(),
            ..Default::default()
        },
    ));

    let turso = hypr_turso::TursoClient::new(std::env::var("TURSO_API_KEY").unwrap());

    let clerk_config = ClerkConfiguration::new(
        None,
        None,
        Some(std::env::var("CLERK_SECRET_KEY").unwrap()),
        None,
    );
    let clerk = Clerk::new(clerk_config);

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let nango_client = hypr_nango::NangoClientBuilder::new()
                .api_key(std::env::var("NANGO_API_KEY").unwrap())
                .integrations(std::collections::HashMap::from([
                    (
                        hypr_nango::NangoIntegration::GoogleCalendar,
                        String::from("google-calendar"),
                    ),
                    (
                        hypr_nango::NangoIntegration::OutlookCalendar,
                        String::from("outlook-calendar"),
                    ),
                ]))
                .build();

            let stt_config = hypr_stt::Config {
                deepgram_api_key: std::env::var("DEEPGRAM_API_KEY").unwrap(),
                clova_api_key: std::env::var("CLOVA_API_KEY").unwrap(),
            };
            let stt = hypr_stt::Client::new(stt_config);

            let admin_db = {
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

                hypr_db::admin::migrate(&conn).await.unwrap();
                hypr_db::admin::AdminDatabase::from(conn)
            };

            let state = state::AppState {
                reqwest: reqwest::Client::new(),
                clerk: clerk.clone(),
                stt,
                turso,
                admin_db,
                nango: nango_client,
                analytics: hypr_analytics::AnalyticsClient::new(
                    std::env::var("POSTHOG_API_KEY").unwrap(),
                ),
            };

            let web_router = Router::new()
                .route("/connect", post(web::connect::handler))
                .route(
                    "/integration/session",
                    post(web::integration::create_session),
                )
                .layer(ClerkLayer::new(
                    MemoryCacheJwksProvider::new(clerk),
                    None,
                    true,
                ));

            #[allow(unused)]
            let mut native_router = Router::new()
                .route(
                    "/enhance",
                    post(native::enhance::handler)
                        .layer(TimeoutLayer::new(Duration::from_secs(20))),
                )
                .route(
                    "/chat/completions",
                    post(native::openai::handler).layer(TimeoutLayer::new(Duration::from_secs(10))),
                )
                .route("/transcribe", get(native::transcribe::handler));

            #[cfg(not(debug_assertions))]
            {
                native_router = native_router.layer(
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
            }

            let webhook_router = Router::new().route("/stripe", post(stripe::webhook::handler));

            let router = Router::new()
                .route("/health", get(|| async { (StatusCode::OK, "OK") }))
                .nest("/api/native", native_router)
                .nest("/api/web", web_router)
                .nest("/webhook", webhook_router)
                .fallback_service({
                    let app_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");

                    ServeDir::new(app_dir.join("dist"))
                        .append_index_html_on_directories(false)
                        .fallback(ServeFile::new(app_dir.join("dist/index.html")))
                })
                .with_state(state);

            let port = std::env::var("PORT").unwrap_or("3000".to_string());
            let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
                .await
                .unwrap();

            let http = async {
                axum::serve(listener, router)
                    .await
                    .map_err(|e| Error::new(ErrorKind::Interrupted, e))
            };

            let monitor = async { worker::monitor().await.unwrap() };

            let _ = tokio::join!(http, monitor);
        });
}

fn export_ts_types() -> anyhow::Result<()> {
    let mut collection = specta_util::TypeCollection::default();

    collection.register::<web::connect::ConnectInput>();
    collection.register::<web::connect::ConnectOutput>();
    collection.register::<web::integration::CreateSessionInput>();
    collection.register::<web::integration::CreateSessionOutput>();

    let language = specta_typescript::Typescript::default()
        .header("// @ts-nocheck\n\n")
        .formatter(specta_typescript::formatter::prettier)
        .bigint(specta_typescript::BigIntExportBehavior::Number);

    let base = env!("CARGO_MANIFEST_DIR");
    let path = std::path::Path::new(base).join("../src/types/server.ts");

    collection.export_to(language, path)?;
    Ok(())
}
