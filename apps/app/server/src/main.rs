mod middleware;
mod native;
mod state;
mod web;
mod webhook;
mod worker;

use std::{
    io::{Error, ErrorKind},
    path::Path,
    time::Duration,
};
use tracing_subscriber::{layer::SubscriberExt as _, util::SubscriberInitExt as _, Registry};

use axum::{
    extract::FromRef,
    http::StatusCode,
    routing::{get, post},
    Router,
};
use tower_http::{
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

    #[cfg(debug_assertions)]
    export_ts_types().unwrap();

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
                    tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                        [
                            &format!("{}=debug", env!("CARGO_CRATE_NAME")),
                            "tower_http=debug",
                            "axum::rejection=trace",
                            "tungstenite=info",
                            "tokio_tungstenite=info",
                        ]
                        .join(",")
                        .into()
                    }),
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
                        hypr_db::ConnectionBuilder::new()
                            .local(":memory:")
                            .connect()
                            .await
                            .unwrap()
                    }

                    #[cfg(not(debug_assertions))]
                    {
                        let name = get_env("TURSO_ADMIN_DB_NAME");
                        let url = turso.db_url(&name);
                        let token = turso.generate_db_token(&name).await.unwrap();

                        hypr_db::ConnectionBuilder::new()
                            .remote(url, token)
                            .connect()
                            .await
                            .unwrap()
                    }
                };

                hypr_db::admin::migrate(&conn).await.unwrap();
                hypr_db::admin::AdminDatabase::from(conn)
            };

            let nango = hypr_nango::NangoClientBuilder::new()
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

            let pyannote = hypr_pyannote::cloud::PyannoteClient::builder()
                .api_key(get_env("PYANNOTE_API_KEY"))
                .build();

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
                pyannote,
            };

            let web_router = Router::new()
                .route("/connect", post(web::connect::handler))
                .route(
                    "/integration/connection",
                    post(web::integration::create_connection).layer(
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

            #[allow(unused)]
            let mut native_router = Router::new()
                .route(
                    "/enhance",
                    post(native::enhance::handler)
                        .layer(TimeoutLayer::new(Duration::from_secs(20))),
                )
                .route(
                    "/create_title",
                    post(native::create_title::handler)
                        .layer(TimeoutLayer::new(Duration::from_secs(10))),
                )
                .route("/listen/realtime", get(native::listen::realtime::handler))
                .route("/listen/recorded", post(native::listen::recorded::handler))
                .route("/user/integrations", get(native::user::list_integrations))
                .route("/upload/create", post(native::upload::create_upload))
                .route("/upload/complete", post(native::upload::complete_upload));
            // .layer(
            //     tower::builder::ServiceBuilder::new()
            //         .layer(axum::middleware::from_fn_with_state(
            //             AuthState::from_ref(&state),
            //             middleware::verify_api_key,
            //         ))
            //         .layer(axum::middleware::from_fn_with_state(
            //             AnalyticsState::from_ref(&state),
            //             middleware::send_analytics,
            //         ))
            //         .layer(axum::middleware::from_fn(middleware::attach_user_db)),
            // );

            let webhook_router = Router::new().route("/nango", post(webhook::nango::handler));

            let mut router = Router::new()
                .route("/health", get(|| async { (StatusCode::OK, "OK") }))
                .nest("/api/native", native_router)
                .nest("/api/web", web_router)
                .nest("/webhook", webhook_router)
                .with_state(state.clone())
                .layer(TraceLayer::new_for_http());

            {
                router = router.fallback_service({
                    let static_dir: std::path::PathBuf = get_env("APP_STATIC_DIR").into();

                    ServeDir::new(&static_dir)
                        .append_index_html_on_directories(false)
                        .fallback(ServeFile::new(static_dir.join("index.html")))
                });
            }

            let port = std::env::var("PORT").unwrap_or("1234".to_string());
            let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
                .await
                .unwrap();

            let http = async {
                axum::serve(listener, router)
                    .await
                    .map_err(|e| Error::new(ErrorKind::Interrupted, e))
            };

            let worker_state = WorkerState::from_ref(&state);
            let monitor = async { worker::monitor(worker_state).await.unwrap() };
            let _result = tokio::join!(http, monitor);
        });
}

fn export_ts_types() -> anyhow::Result<()> {
    let mut web_collection = specta_util::TypeCollection::default();
    let mut native_collection = specta_util::TypeCollection::default();

    web_collection.register::<web::connect::ConnectInput>();
    web_collection.register::<web::connect::ConnectOutput>();
    web_collection.register::<web::integration::CreateSessionInput>();
    web_collection.register::<web::integration::CreateSessionOutput>();
    web_collection.register::<hypr_nango::NangoIntegration>();

    native_collection.register::<hypr_nango::NangoIntegration>();
    native_collection.register::<hypr_bridge::EnhanceRequest>();
    native_collection.register::<hypr_bridge::CreateTitleRequest>();
    native_collection.register::<hypr_bridge::CreateTitleResponse>();

    let language = specta_typescript::Typescript::default()
        .header("// @ts-nocheck\n\n")
        .bigint(specta_typescript::BigIntExportBehavior::Number);

    let base = env!("CARGO_MANIFEST_DIR");
    let web_path = Path::new(base).join("../src/types/server.gen.ts");
    let native_path = Path::new(base).join("../../desktop/src/types/server.gen.ts");

    web_collection.export_to(language.clone(), web_path)?;
    native_collection.export_to(language, native_path)?;
    Ok(())
}

fn get_env(key: &str) -> String {
    std::env::var(key).expect(&format!("env: '{}' is not set", key))
}
