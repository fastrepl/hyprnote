use tauri::Manager;

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

mod client;
mod commands;
mod events;
mod ext;
mod timeline;

pub use client::*;
pub use events::*;
pub use ext::ListenerPluginExt;
pub use timeline::*;

pub use hypr_listener_types::*;

const PLUGIN_NAME: &str = "listener";

pub type SharedState = Mutex<State>;

#[derive(Default)]
pub struct State {
    timeline: Option<Arc<Mutex<crate::Timeline>>>,
    mic_stream_handle: Option<tokio::task::JoinHandle<()>>,
    speaker_stream_handle: Option<tokio::task::JoinHandle<()>>,
    listen_stream_handle: Option<tokio::task::JoinHandle<()>>,
    silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
    channels: Arc<Mutex<HashMap<u32, tauri::ipc::Channel<SessionEvent>>>>,
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::request_microphone_access::<tauri::Wry>,
            commands::request_system_audio_access::<tauri::Wry>,
            commands::open_microphone_access_settings::<tauri::Wry>,
            commands::open_system_audio_access_settings::<tauri::Wry>,
            commands::get_timeline::<tauri::Wry>,
            commands::subscribe::<tauri::Wry>,
            commands::unsubscribe::<tauri::Wry>,
            commands::start_session::<tauri::Wry>,
            commands::stop_session::<tauri::Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            app.manage(SharedState::default());
            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "./js/bindings.gen.ts",
            )
            .unwrap()
    }

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .plugin(init())
            .plugin(tauri_plugin_local_stt::init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    #[tokio::test]
    async fn test_subscribe_and_broadcast() {
        let app = create_app(tauri::test::mock_builder());

        let (tx1, rx1) = std::sync::mpsc::sync_channel::<SessionEvent>(1);
        let (tx2, rx2) = std::sync::mpsc::sync_channel::<SessionEvent>(1);

        let channel_1 = tauri::ipc::Channel::<SessionEvent>::new(move |e| {
            let event = e.deserialize().unwrap();
            let _ = tx1.send(event);
            Ok(())
        });
        let channel_2 = tauri::ipc::Channel::<SessionEvent>::new(move |e| {
            let event = e.deserialize().unwrap();
            let _ = tx2.send(event);
            Ok(())
        });

        app.subscribe(channel_1.clone()).await;
        app.subscribe(channel_2.clone()).await;

        app.broadcast(SessionEvent::Stopped).await.unwrap();

        assert_eq!(rx1.recv().unwrap(), SessionEvent::Stopped);
        assert_eq!(rx2.recv().unwrap(), SessionEvent::Stopped);
    }

    #[tokio::test]
    #[ignore]
    async fn test_session() {
        let app = create_app(tauri::test::mock_builder());

        {
            use tauri_plugin_local_stt::LocalSttPluginExt;
            let c = tauri::ipc::Channel::<u8>::new(|_e| Ok(()));
            app.load_model(c).await.unwrap();
            app.start_server().await.unwrap();
        }

        app.start_session().await.unwrap();

        {
            let chan = tauri::ipc::Channel::<SessionEvent>::new(|e| {
                let event: SessionEvent = e.deserialize().unwrap();
                println!("event: {:?}", event);
                Ok(())
            });

            app.subscribe(chan).await;
        }

        {
            let (_stream, stream_handle) = rodio::OutputStream::try_default().unwrap();
            let sink = rodio::Sink::try_new(&stream_handle).unwrap();
            let source = rodio::Decoder::new_wav(std::io::BufReader::new(
                std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
            ))
            .unwrap();
            sink.append(source);
            sink.sleep_until_end();
        }

        app.stop_session().await.unwrap();
    }
}
