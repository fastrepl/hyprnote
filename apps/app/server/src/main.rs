mod middleware;
mod nango;
mod native;
mod openapi;
mod slack;
mod state;
#[path = "stripe.rs"]
mod stripe_webhook;
mod types;
mod web;
mod worker;

use std::{
    io::{Error, ErrorKind},
    time::Duration,
};
use tracing_subscriber::{layer::SubscriberExt as _, util::SubscriberInitExt as _, Registry};

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

use state::{AuthState, WorkerState};

fn main() {
    #[cfg(debug_assertions)]
    dotenv::from_filename(".env.local").unwrap();

    let _guard = sentry::init((
        get_env("SENTRY_DSN"),
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
                #[cfg(debug_assertions)]
                {
                    tracing_subscriber::fmt::layer()
                        .with_file(true)
                        .with_line_number(true)
                }

                #[cfg(not(debug_assertions))]
                {
                    tracing_axiom::builder("hyprnote-server")
                        .with_token(get_env("AXIOM_TOKEN"))
                        .unwrap()
                        .with_dataset(get_env("AXIOM_DATASET"))
                        .unwrap()
                        .build()
                        .unwrap()
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
                .api_key(get_env("TURSO_API_KEY"))
                .org_slug(get_env("TURSO_ORG_SLUG"))
                .build();

            let clerk_config =
                ClerkConfiguration::new(None, None, Some(get_env("CLERK_SECRET_KEY")), None);
            let clerk = Clerk::new(clerk_config);

            let realtime_stt = hypr_stt::realtime::Client::builder()
                .deepgram_api_key(get_env("DEEPGRAM_API_KEY"))
                .clova_api_key(get_env("CLOVA_API_KEY"))
                .build();

            let recorded_stt = hypr_stt::recorded::Client::builder()
                .deepgram_api_key(get_env("DEEPGRAM_API_KEY"))
                .clova_api_key(get_env("CLOVA_API_KEY"))
                .build();

            let diarize = hypr_bridge::diarize::DiarizeClient::builder()
                .api_base(get_env("DIARIZE_API_BASE"))
                .api_key(get_env("DIARIZE_API_KEY"))
                .sample_rate(16000)
                .build();

            let admin_db = {
                let conn = {
                    #[cfg(debug_assertions)]
                    {
                        hypr_db::DatabaseBaseBuilder::default()
                            .local(":memory:")
                            .build()
                            .await
                            .unwrap()
                            .connect()
                            .unwrap()
                    }

                    #[cfg(not(debug_assertions))]
                    {
                        let name = get_env("TURSO_ADMIN_DB_NAME");
                        let url = turso.db_url(&name);
                        let token = turso.generate_db_token(&name).await.unwrap();

                        hypr_db::DatabaseBaseBuilder::default()
                            .remote(url, token)
                            .build()
                            .await
                            .unwrap()
                            .connect()
                            .unwrap()
                    }
                };

                hypr_db::admin::migrate(&conn).await.unwrap();
                let db = hypr_db::admin::AdminDatabase::from(conn);

                #[cfg(debug_assertions)]
                {
                    hypr_db::admin::seed(&db).await.unwrap();
                }

                db
            };

            let nango = hypr_nango::NangoClientBuilder::default()
                .api_base(get_env("NANGO_API_BASE"))
                .api_key(get_env("NANGO_API_KEY"))
                .build();

            let analytics = hypr_analytics::AnalyticsClient::new(get_env("POSTHOG_API_KEY"));

            let s3 = hypr_s3::Client::builder()
                .endpoint_url(get_env("S3_ENDPOINT_URL"))
                .bucket(get_env("S3_BUCKET_NAME"))
                .credentials(get_env("S3_ACCESS_KEY_ID"), get_env("S3_SECRET_ACCESS_KEY"))
                .build()
                .await;

            let openai = hypr_openai::OpenAIClient::builder()
                .api_key(get_env("OPENAI_API_KEY"))
                .api_base(get_env("OPENAI_API_BASE"))
                .build();

            let stripe_client = stripe::Client::new(get_env("STRIPE_SECRET_KEY"));

            let state = state::AppState {
                clerk: clerk.clone(),
                realtime_stt,
                recorded_stt,
                diarize,
                turso,
                admin_db,
                nango,
                analytics,
                s3,
                openai,
                stripe: stripe_client,
            };

            let web_router = ApiRouter::new()
                .api_route("/connect", api_post(web::connect::handler))
                .api_route(
                    "/session/{id}",
                    api_get(web::session::handler)
                        .layer(axum::middleware::from_fn(middleware::attach_user_db)),
                )
                .api_route(
                    "/integration/connection",
                    api_post(web::integration::create_connection).layer(
                        axum::middleware::from_fn_with_state(
                            AuthState::from_ref(&state),
                            middleware::attach_user_from_clerk,
                        ),
                    ),
                )
                .layer(ClerkLayer::new(
                    MemoryCacheJwksProvider::new(clerk),
                    None,
                    true,
                ));

            let native_router = ApiRouter::new()
                .api_route(
                    "/chat/completions",
                    api_post(native::openai::handler)
                        .layer(TimeoutLayer::new(Duration::from_secs(10))),
                )
                .api_route(
                    "/user/integrations",
                    api_get(native::user::list_integrations),
                )
                .api_route("/subscription", api_get(native::subscription::handler))
                .route("/listen/realtime", get(native::listen::realtime::handler))
                .route("/listen/recorded", post(native::listen::recorded::handler));
            // .layer(
            //     tower::builder::ServiceBuilder::new()
            //         .layer(axum::middleware::from_fn_with_state(
            //             AuthState::from_ref(&state),
            //             middleware::verify_api_key,
            //         ))
            //         .layer(axum::middleware::from_fn(middleware::attach_user_db)),
            // );

            let slack_router = ApiRouter::new();

            let webhook_router = ApiRouter::new()
                .route("/nango", post(nango::handler))
                .route("/stripe", post(stripe_webhook::handler))
                .nest("/slack", slack_router);

            let mut router = ApiRouter::new()
                .route("/openapi.json", get(openapi::handler))
                .route("/scalar", Scalar::new("/openapi.json").axum_route())
                .api_route("/health", api_get(|| async { (StatusCode::OK, "OK") }))
                .nest("/api/native", native_router)
                .nest("/api/web", web_router)
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
                    let static_dir: std::path::PathBuf = get_env("APP_STATIC_DIR").into();

                    ServeDir::new(&static_dir)
                        .append_index_html_on_directories(false)
                        .fallback(ServeFile::new(static_dir.join("index.html")))
                });
            }

            let mut api = OpenApi::default();

            let port = std::env::var("PORT").unwrap_or("1234".to_string());
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
                    .map_err(|e| Error::new(ErrorKind::Interrupted, e))
            };

            let worker_state = WorkerState::from_ref(&state);
            let monitor = async { worker::monitor(worker_state).await.unwrap() };
            let _result = tokio::join!(http, monitor);
        });
}

fn get_env(key: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| panic!("env: '{}' is not set", key))
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
