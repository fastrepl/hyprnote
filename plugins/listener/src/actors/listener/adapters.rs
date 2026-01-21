use std::time::{Duration, UNIX_EPOCH};

use bytes::Bytes;
use ractor::{ActorProcessingErr, ActorRef};

use owhisper_client::{
    AdapterKind, ArgmaxAdapter, AssemblyAIAdapter, DeepgramAdapter, ElevenLabsAdapter,
    FireworksAdapter, GladiaAdapter, OpenAIAdapter, RealtimeSttAdapter, SonioxAdapter,
};
use owhisper_interface::stream::Extra;
use owhisper_interface::{ControlMessage, MixedMessage};

use super::stream::{ChannelSender, LISTEN_CONNECT_TIMEOUT, process_stream};
use super::{ListenerArgs, ListenerMsg};
use crate::DegradedError;

const DEVICE_FINGERPRINT_HEADER: &str = "x-device-fingerprint";

#[derive(Debug)]
struct ListenerInitError(String);

impl std::fmt::Display for ListenerInitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for ListenerInitError {}

fn actor_error(msg: impl Into<String>) -> ActorProcessingErr {
    Box::new(ListenerInitError(msg.into()))
}

pub(super) async fn spawn_rx_task(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        ChannelSender,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
        String,
    ),
    ActorProcessingErr,
> {
    let adapter_kind =
        AdapterKind::from_url_and_languages(&args.base_url, &args.languages, Some(&args.model));
    let is_dual = matches!(args.mode, crate::actors::ChannelMode::MicAndSpeaker);

    let adapter_name = match adapter_kind {
        AdapterKind::Argmax => "Argmax",
        AdapterKind::Soniox => "Soniox",
        AdapterKind::Fireworks => "Fireworks",
        AdapterKind::Deepgram => "Deepgram",
        AdapterKind::AssemblyAI => "AssemblyAI",
        AdapterKind::OpenAI => "OpenAI",
        AdapterKind::Gladia => "Gladia",
        AdapterKind::ElevenLabs => "ElevenLabs",
    };

    let result = match (adapter_kind, is_dual) {
        (AdapterKind::Argmax, false) => {
            spawn_rx_task_single_with_adapter::<ArgmaxAdapter>(args, myself).await
        }
        (AdapterKind::Argmax, true) => {
            spawn_rx_task_dual_with_adapter::<ArgmaxAdapter>(args, myself).await
        }
        (AdapterKind::Soniox, false) => {
            spawn_rx_task_single_with_adapter::<SonioxAdapter>(args, myself).await
        }
        (AdapterKind::Soniox, true) => {
            spawn_rx_task_dual_with_adapter::<SonioxAdapter>(args, myself).await
        }
        (AdapterKind::Fireworks, false) => {
            spawn_rx_task_single_with_adapter::<FireworksAdapter>(args, myself).await
        }
        (AdapterKind::Fireworks, true) => {
            spawn_rx_task_dual_with_adapter::<FireworksAdapter>(args, myself).await
        }
        (AdapterKind::Deepgram, false) => {
            spawn_rx_task_single_with_adapter::<DeepgramAdapter>(args, myself).await
        }
        (AdapterKind::Deepgram, true) => {
            spawn_rx_task_dual_with_adapter::<DeepgramAdapter>(args, myself).await
        }
        (AdapterKind::AssemblyAI, false) => {
            spawn_rx_task_single_with_adapter::<AssemblyAIAdapter>(args, myself).await
        }
        (AdapterKind::AssemblyAI, true) => {
            spawn_rx_task_dual_with_adapter::<AssemblyAIAdapter>(args, myself).await
        }
        (AdapterKind::OpenAI, false) => {
            spawn_rx_task_single_with_adapter::<OpenAIAdapter>(args, myself).await
        }
        (AdapterKind::OpenAI, true) => {
            spawn_rx_task_dual_with_adapter::<OpenAIAdapter>(args, myself).await
        }
        (AdapterKind::Gladia, false) => {
            spawn_rx_task_single_with_adapter::<GladiaAdapter>(args, myself).await
        }
        (AdapterKind::Gladia, true) => {
            spawn_rx_task_dual_with_adapter::<GladiaAdapter>(args, myself).await
        }
        (AdapterKind::ElevenLabs, false) => {
            spawn_rx_task_single_with_adapter::<ElevenLabsAdapter>(args, myself).await
        }
        (AdapterKind::ElevenLabs, true) => {
            spawn_rx_task_dual_with_adapter::<ElevenLabsAdapter>(args, myself).await
        }
    }?;

    Ok((result.0, result.1, result.2, adapter_name.to_string()))
}

pub(super) fn build_listen_params(args: &ListenerArgs) -> owhisper_interface::ListenParams {
    let redemption_time_ms = if args.onboarding { "60" } else { "400" };
    owhisper_interface::ListenParams {
        model: Some(args.model.clone()),
        languages: args.languages.clone(),
        sample_rate: crate::actors::SAMPLE_RATE,
        keywords: args.keywords.clone(),
        custom_query: Some(std::collections::HashMap::from([(
            "redemption_time_ms".to_string(),
            redemption_time_ms.to_string(),
        )])),
        ..Default::default()
    }
}

pub(super) fn build_extra(args: &ListenerArgs) -> (f64, Extra) {
    let session_offset_secs = args.session_started_at.elapsed().as_secs_f64();
    let started_unix_millis = args
        .session_started_at_unix
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_millis()
        .min(u64::MAX as u128) as u64;

    let extra = Extra {
        started_unix_millis,
    };

    (session_offset_secs, extra)
}

async fn spawn_rx_task_single_with_adapter<A: RealtimeSttAdapter>(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        ChannelSender,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let (session_offset_secs, extra) = build_extra(&args);

    let (tx, rx) = tokio::sync::mpsc::channel::<MixedMessage<Bytes, ControlMessage>>(32);

    let client = owhisper_client::ListenClient::builder()
        .adapter::<A>()
        .api_base(args.base_url.clone())
        .api_key(args.api_key.clone())
        .params(build_listen_params(&args))
        .extra_header(DEVICE_FINGERPRINT_HEADER, hypr_host::fingerprint())
        .build_single()
        .await;

    let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

    let connect_result =
        tokio::time::timeout(LISTEN_CONNECT_TIMEOUT, client.from_realtime_audio(outbound)).await;

    let (listen_stream, handle) = match connect_result {
        Err(_elapsed) => {
            tracing::error!(
                session_id = %args.session_id,
                timeout_secs = LISTEN_CONNECT_TIMEOUT.as_secs_f32(),
                "listen_ws_connect_timeout(single)"
            );
            return Err(actor_error(
                serde_json::to_string(&DegradedError::ConnectionTimeout)
                    .unwrap_or_else(|_| "connection_timeout".to_string()),
            ));
        }
        Ok(Err(e)) => {
            tracing::error!(session_id = %args.session_id, error = ?e, "listen_ws_connect_failed(single)");
            return Err(actor_error(
                serde_json::to_string(&DegradedError::UpstreamUnavailable {
                    message: format!("{:?}", e),
                })
                .unwrap_or_else(|_| format!("{:?}", e)),
            ));
        }
        Ok(Ok(res)) => res,
    };

    let rx_task = tokio::spawn(async move {
        futures_util::pin_mut!(listen_stream);
        process_stream(
            listen_stream,
            handle,
            myself,
            shutdown_rx,
            session_offset_secs,
            extra,
        )
        .await;
    });

    Ok((ChannelSender::Single(tx), rx_task, shutdown_tx))
}

async fn spawn_rx_task_dual_with_adapter<A: RealtimeSttAdapter>(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        ChannelSender,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let (session_offset_secs, extra) = build_extra(&args);

    let (tx, rx) = tokio::sync::mpsc::channel::<MixedMessage<(Bytes, Bytes), ControlMessage>>(32);

    let client = owhisper_client::ListenClient::builder()
        .adapter::<A>()
        .api_base(args.base_url.clone())
        .api_key(args.api_key.clone())
        .params(build_listen_params(&args))
        .extra_header(DEVICE_FINGERPRINT_HEADER, hypr_host::fingerprint())
        .build_dual()
        .await;

    let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

    let connect_result =
        tokio::time::timeout(LISTEN_CONNECT_TIMEOUT, client.from_realtime_audio(outbound)).await;

    let (listen_stream, handle) = match connect_result {
        Err(_elapsed) => {
            tracing::error!(
                session_id = %args.session_id,
                timeout_secs = LISTEN_CONNECT_TIMEOUT.as_secs_f32(),
                "listen_ws_connect_timeout(dual)"
            );
            return Err(actor_error(
                serde_json::to_string(&DegradedError::ConnectionTimeout)
                    .unwrap_or_else(|_| "connection_timeout".to_string()),
            ));
        }
        Ok(Err(e)) => {
            tracing::error!(session_id = %args.session_id, error = ?e, "listen_ws_connect_failed(dual)");
            return Err(actor_error(
                serde_json::to_string(&DegradedError::UpstreamUnavailable {
                    message: format!("{:?}", e),
                })
                .unwrap_or_else(|_| format!("{:?}", e)),
            ));
        }
        Ok(Ok(res)) => res,
    };

    let rx_task = tokio::spawn(async move {
        futures_util::pin_mut!(listen_stream);
        process_stream(
            listen_stream,
            handle,
            myself,
            shutdown_rx,
            session_offset_secs,
            extra,
        )
        .await;
    });

    Ok((ChannelSender::Dual(tx), rx_task, shutdown_tx))
}
