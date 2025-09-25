use std::{
    net::{Ipv4Addr, SocketAddr},
    path::PathBuf,
};

use axum::{error_handling::HandleError, Router};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};
use reqwest::StatusCode;
use tower_http::cors::{self, CorsLayer};

use super::ServerHealth;
use hypr_whisper_local_model::WhisperModel;

pub enum InternalSTTMessage {
    GetHealth(RpcReplyPort<(String, ServerHealth)>),
    ServerError(String),
}

pub struct InternalSTTArgs {
    pub model_type: WhisperModel,
    pub model_cache_dir: PathBuf,
}

pub struct InternalSTTState {
    base_url: String,
    shutdown: tokio::sync::watch::Sender<()>,
    server_task: tokio::task::JoinHandle<()>,
}

pub struct InternalSTTActor;

impl InternalSTTActor {
    pub fn name() -> ActorName {
        "internal_stt".into()
    }
}

impl Actor for InternalSTTActor {
    type Msg = InternalSTTMessage;
    type State = InternalSTTState;
    type Arguments = InternalSTTArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let model_path = args.model_cache_dir.join(args.model_type.file_name());

        let whisper_service = HandleError::new(
            hypr_transcribe_whisper_local::TranscribeService::builder()
                .model_path(model_path)
                .build(),
            move |err: String| async move {
                let _ = myself.send_message(InternalSTTMessage::ServerError(err.clone()));
                (StatusCode::INTERNAL_SERVER_ERROR, err)
            },
        );

        let router = Router::new()
            .route_service("/v1/listen", whisper_service)
            .layer(
                CorsLayer::new()
                    .allow_origin(cors::Any)
                    .allow_methods(cors::Any)
                    .allow_headers(cors::Any),
            );

        let listener =
            tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0))).await?;

        let server_addr = listener.local_addr()?;
        let base_url = format!("http://{}", server_addr);

        let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());

        let server_task = tokio::spawn(async move {
            axum::serve(listener, router)
                .with_graceful_shutdown(async move {
                    shutdown_rx.changed().await.ok();
                })
                .await
                .unwrap();
        });

        Ok(InternalSTTState {
            base_url,
            shutdown: shutdown_tx,
            server_task,
        })
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        let _ = state.shutdown.send(());
        state.server_task.abort();
        Ok(())
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            InternalSTTMessage::GetHealth(reply_port) => {
                let status = ServerHealth::Ready;

                if let Err(e) = reply_port.send((state.base_url.clone(), status)) {
                    return Err(e.into());
                }

                Ok(())
            }
            InternalSTTMessage::ServerError(e) => Err(e.into()),
        }
    }
}
