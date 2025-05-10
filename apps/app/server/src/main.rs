mod env;
mod error;
mod middleware;
mod nango;
mod native;
mod openapi;
mod slack;
mod state;
#[path = "stripe/mod.rs"]
mod stripe_mod;
mod types;
mod web;
mod worker;

use std::time::Duration;
use tracing_subscriber::{layer::SubscriberExt as _, util::SubscriberInitExt as _, Registry};
use types::Error;

use aide::{
    axum::{
        routing::{get as api_get, post as api_post},
        ApiRouter,
    },
    openapi::OpenApi,
    scalar::Scalar,
};
use axum::{
    extract::FromRef,
    http::StatusCode,
    routing::{get, post},
    Extension,
};
use tower_http::{
    cors::{self, CorsLayer},
    services::{ServeDir, ServeFile},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

use clerk_rs::{
    clerk::Clerk,
    validators::{axum::ClerkLayer, jwks::MemoryCacheJwksProvider},
    ClerkConfiguration,
};

use state::{AnalyticsState, AuthState, WorkerState};

fn main() {
    let config = env::load();

    let _guard = sentry::init((
        config.sentry_dsn.clone(),
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
            let layer = {
                {
                    tracing_subscriber::fmt::layer()
                        .with_file(true)
                        .with_line_number(true)
                }
            };

            Registry::default()
                .with(
                    tracing_subscriber::EnvFilter::from_default_env()
                        .add_directive("info".parse().unwrap())
                        .add_directive(
                            format!("{}=debug", env!("CARGO_CRATE_NAME"))
                                .parse()
                                .unwrap(),
                        )
                        .add_directive("tower_http=debug".parse().unwrap())
                        .add_directive("axum::rejection=trace".parse().unwrap())
                        .add_directive("tungstenite=info".parse().unwrap())
                        .add_directive("tokio_tungstenite=info".parse().unwrap()),
                )
                .with(layer)
                .init();

            let turso = hypr_turso::TursoClient::builder()
                .with_token_cache(128)
                .api_key(&config.turso_api_key)
                .org_slug(&config.turso_org_slug)
                .build();

            let clerk_config =
                ClerkConfiguration::new(None, None, Some(config.clerk_secret_key.clone()), None);
            let clerk = Clerk::new(clerk_config);

            let realtime_stt = hypr_stt::realtime::Client::builder()
                .deepgram_api_key(&config.deepgram_api_key)
                .clova_api_key(&config.clova_api_key)
                .build();

            let recorded_stt = hypr_stt::recorded::Client::builder()
                .deepgram_api_key(&config.deepgram_api_key)
                .clova_api_key(&config.clova_api_key)
                .build();

            let admin_db = {
                let base_db = {
                    let name = &config.turso_admin_db_name;

                    let db_name = turso.format_db_name(name);
                    let db_url = turso.format_db_url(&db_name);
                    let db_token = turso.generate_db_token(&db_name).await.unwrap();

                    hypr_db_core::DatabaseBuilder::default()
                        .remote(db_url, db_token)
                        .build()
                        .await
                        .unwrap()
                };

                let admin_db = hypr_db_admin::AdminDatabase::from(base_db);
                hypr_db_admin::migrate(&admin_db).await.unwrap();

                admin_db
            };

            let nango = hypr_nango::NangoClientBuilder::default()
                .api_base(&config.nango_api_base)
                .api_key(&config.nango_api_key)
                .build();

            let analytics = hypr_analytics::AnalyticsClient::new(&config.posthog_api_key);

            let s3 = hypr_s3::Client::builder()
                .endpoint_url(&config.s3_endpoint_url)
                .bucket(&config.s3_bucket_name)
                .credentials(&config.s3_access_key_id, &config.s3_secret_access_key)
                .build()
                .await;

            let openai = hypr_openai::OpenAIClient::builder()
                .api_key(&config.openai_api_key)
                .api_base(&config.openai_api_base)
                .build();

            let stripe_client = stripe::Client::new(&config.stripe_secret_key);

            let state = state::AppState {
                clerk: clerk.clone(),
                realtime_stt,
                recorded_stt,
                turso,
                admin_db,
                nango,
                analytics,
                s3,
                openai,
                stripe: stripe_client,
                stripe_webhook_signing_secret: config.stripe_webhook_signing_secret,
            };

            let web_connect_router =
                ApiRouter::new().api_route("/connect", api_post(web::connect::handler));

            let web_other_router = ApiRouter::new()
                .api_route("/checkout", api_get(web::checkout::handler))
                .api_route("/session/{id}", api_get(web::session::handler))
                .api_route(
                    "/integration/connection",
                    api_post(web::integration::create_connection),
                )
                .layer(tower::builder::ServiceBuilder::new().layer(
                    axum::middleware::from_fn_with_state(
                        AuthState::from_ref(&state),
                        middleware::attach_user_from_clerk,
                    ),
                ));

            let web_router = web_connect_router
                .merge(web_other_router)
                .layer(ClerkLayer::new(
                    MemoryCacheJwksProvider::new(clerk),
                    None,
                    true,
                ));

            let desktop_router = ApiRouter::new()
                .api_route(
                    "/user/integrations",
                    api_get(native::user::list_integrations),
                )
                .api_route("/subscription", api_get(native::subscription::handler))
                .route("/listen/realtime", get(native::listen::realtime::handler))
                .layer(
                    tower::builder::ServiceBuilder::new()
                        .layer(axum::middleware::from_fn_with_state(
                            AuthState::from_ref(&state),
                            middleware::verify_api_key,
                        ))
                        .layer(axum::middleware::from_fn_with_state(
                            AnalyticsState::from_ref(&state),
                            middleware::send_analytics,
                        )),
                );

            let webhook_router = ApiRouter::new()
                .route("/stripe", post(stripe_mod::webhook::handler))
                .route("/nango", post(nango::handler))
                .with_state(state::WebhookState::from_ref(&state));

            let mut router = ApiRouter::new()
                .route("/openapi.json", get(openapi::handler))
                .route("/scalar", Scalar::new("/openapi.json").axum_route())
                .api_route("/health", api_get(|| async { (StatusCode::OK, "OK") }))
                .nest("/api/desktop", desktop_router)
                .nest("/api/web", web_router)
                .api_route(
                    "/chat/completions",
                    api_post(native::openai::handler)
                        .layer(TimeoutLayer::new(Duration::from_secs(10))),
                )
                .nest("/webhook", webhook_router)
                .with_state(state.clone())
                .layer(TraceLayer::new_for_http());

            {
                router = router.layer(
                    CorsLayer::new()
                        .allow_origin(cors::Any)
                        .allow_methods(cors::Any)
                        .allow_headers(cors::Any),
                );
            }

            {
                router = router.fallback_service({
                    let static_dir: std::path::PathBuf = config.app_static_dir.clone().into();

                    ServeDir::new(&static_dir)
                        .append_index_html_on_directories(false)
                        .fallback(ServeFile::new(static_dir.join("index.html")))
                });
            }

            let mut api = OpenApi::default();

            let port = &config.port;
            let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
                .await
                .unwrap();

            let service = router
                .finish_api_with(&mut api, |api| {
                    api.security_scheme(
                        "bearer_token",
                        aide::openapi::SecurityScheme::Http {
                            scheme: "Bearer".to_string(),
                            bearer_format: None,
                            description: None,
                            extensions: Default::default(),
                        },
                    )
                })
                .layer(Extension(api.clone()))
                .into_make_service();

            #[cfg(debug_assertions)]
            {
                let base: std::path::PathBuf = env!("CARGO_MANIFEST_DIR").into();
                std::fs::write(
                    base.join("./openapi.gen.json"),
                    serde_json::to_string_pretty(&api).unwrap(),
                )
                .unwrap();
            }

            let http = async {
                axum::serve(listener, service)
                    .await
                    .map_err(|e| std::io::Error::new(std::io::ErrorKind::Interrupted, e))
            };

            let worker_state = WorkerState::from_ref(&state);
            let monitor = async { worker::monitor(worker_state).await.unwrap() };
            let _result = tokio::join!(http, monitor);
        });
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_export_ts_types() -> anyhow::Result<()> {
        let mut web_collection = specta::TypeCollection::default();
        let mut native_collection = specta::TypeCollection::default();

        web_collection.register::<hypr_nango::NangoIntegration>();
        native_collection.register::<hypr_nango::NangoIntegration>();

        let language = specta_typescript::Typescript::default()
            .header("// @ts-nocheck\n\n")
            .bigint(specta_typescript::BigIntExportBehavior::Number);

        let base = env!("CARGO_MANIFEST_DIR");
        let web_path = std::path::Path::new(base).join("../src/types/server.gen.ts");
        let native_path = std::path::Path::new(base).join("../../desktop/src/types/server.gen.ts");

        language.export_to(web_path, &web_collection)?;
        language.export_to(native_path, &native_collection)?;
        Ok(())
    }
}
