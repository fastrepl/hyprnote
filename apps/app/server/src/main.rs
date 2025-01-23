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

use axum::{
    extract::FromRef,
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

    let turso = hypr_turso::TursoClient::builder()
        .api_key(get_env("TURSO_API_KEY"))
        .org_slug(get_env("TURSO_ORG_SLUG"))
        .build();

    let clerk_config = ClerkConfiguration::new(None, None, Some(get_env("CLERK_SECRET_KEY")), None);
    let clerk = Clerk::new(clerk_config);

    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let stt = hypr_stt::realtime::Client::builder()
                .deepgram_api_key(get_env("DEEPGRAM_API_KEY"))
                .clova_api_key(get_env("CLOVA_API_KEY"))
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

            let pyannote = hypr_pyannote::PyannoteClient::builder()
                .api_key(get_env("PYANNOTE_API_KEY"))
                .build();

            let state = state::AppState {
                clerk: clerk.clone(),
                stt,
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
                .route("/transcribe", get(native::transcribe::handler))
                .route("/user/integrations", get(native::user::list_integrations))
                .route("/upload/create", post(native::upload::create_upload))
                .route("/upload/complete", post(native::upload::complete_upload))
                .route("/diarization/submit", post(native::diarization::submit))
                .route("/diarization/retrieve", post(native::diarization::retrieve));
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
                .with_state(state.clone());

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
    native_collection.register::<native::diarization::SubmitRequest>();
    native_collection.register::<native::diarization::SubmitResponse>();
    native_collection.register::<native::diarization::RetrieveRequest>();
    native_collection.register::<native::diarization::RetrieveResponse>();

    let language = specta_typescript::Typescript::default()
        .header("// @ts-nocheck\n\n")
        .bigint(specta_typescript::BigIntExportBehavior::Number);

    let base = env!("CARGO_MANIFEST_DIR");
    let web_path = Path::new(base).join("../src/types/server.ts");
    let native_path = Path::new(base).join("../../desktop/src/types/server.ts");

    web_collection.export_to(language.clone(), web_path)?;
    native_collection.export_to(language, native_path)?;
    Ok(())
}

fn get_env(key: &str) -> String {
    std::env::var(key).expect(&format!("env: '{}' is not set", key))
}
