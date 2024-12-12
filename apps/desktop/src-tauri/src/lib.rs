use cap_media::feeds::{AudioInputFeed, AudioInputSamplesSender};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;

mod audio;
mod db;
mod file;
mod permissions;
mod session;

#[derive(specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct App {
    #[serde(skip)]
    handle: AppHandle,
    #[serde(skip)]
    audio_input_feed: Option<AudioInputFeed>,
    #[serde(skip)]
    audio_input_tx: AudioInputSamplesSender,
}

#[tauri::command]
#[specta::specta]
async fn list_audio_devices() -> Result<Vec<String>, ()> {
    if !permissions::do_permissions_check(false)
        .microphone
        .permitted()
    {
        return Ok(vec![]);
    }

    Ok(AudioInputFeed::list_devices().keys().cloned().collect())
}

#[tauri::command]
#[specta::specta]
async fn start_playback(_app: AppHandle, _audio_id: String) {}

#[tauri::command]
#[specta::specta]
async fn stop_playback(_app: AppHandle, _audio_id: String) {}

#[tauri::command]
#[specta::specta]
fn start_recording(app: AppHandle) -> Result<(), String> {
    audio::AppSounds::StartRecording.play();

    let id = uuid::Uuid::new_v4().to_string();

    let recording_dir = app
        .path()
        .app_data_dir()
        .unwrap()
        .join("sessions")
        .join(format!("{id}.hypr"));

    std::fs::create_dir_all(&recording_dir).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
fn stop_recording() {
    audio::AppSounds::StopRecording.play();
}

#[tauri::command]
#[specta::specta]
fn list_recordings(app: AppHandle) -> Result<Vec<(String, PathBuf)>, String> {
    let recordings_dir = recordings_path(&app);

    if !recordings_dir.exists() {
        return Ok(Vec::new());
    }

    Ok(Vec::new())
}

#[tauri::command]
#[specta::specta]
fn ort_segmentation(_app: AppHandle) -> Result<(), String> {
    Ok(())
}

fn recordings_path(app: &AppHandle) -> PathBuf {
    let path = app.path().app_data_dir().unwrap().join("recordings");
    std::fs::create_dir_all(&path).unwrap_or_default();
    path
}

fn recording_path(app: &AppHandle, recording_id: &str) -> PathBuf {
    recordings_path(app).join(format!("{}.cap", recording_id))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let specta_builder = tauri_specta::Builder::new()
        .commands(tauri_specta::collect_commands![
            list_audio_devices,
            start_recording,
            stop_recording,
            start_playback,
            stop_playback,
            ort_segmentation,
            permissions::open_permission_settings,
            file::open_path,
        ])
        .events(tauri_specta::collect_events![]);

    #[cfg(debug_assertions)]
    specta_builder
        .export(
            specta_typescript::Typescript::default(),
            "../src/utils/tauri.ts",
        )
        .expect("Failed to export typescript bindings");

    let mut builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(&db::url(), db::migrations())
                .build(),
        )
        .plugin(tauri_plugin_positioner::init());

    // https://v2.tauri.app/plugin/single-instance/#focusing-on-new-instance
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }));
    }

    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(
            tauri_plugin_keygen_rs2::Builder::new(
                dotenvy_macro::dotenv!("KEYGEN_ACCOUNT"),
                dotenvy_macro::dotenv!("KEYGEN_PRODUCT"),
                dotenvy_macro::dotenv!("KEYGEN_PUBLIC_KEY"),
            )
            .api_url(dotenvy_macro::dotenv!("KEYGEN_API_URL"))
            .build(),
        );
    }

    let (audio_input_tx, _audio_input_rx) = AudioInputFeed::create_channel();

    builder
        .plugin(tauri_plugin_shell::init())
        // TODO: https://v2.tauri.app/plugin/updater/#building
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler({
            let handler = specta_builder.invoke_handler();
            move |invoke| handler(invoke)
        })
        .setup(move |app| {
            let app = app.handle().clone();

            app.manage(RwLock::new(App {
                handle: app.clone(),
                audio_input_tx,
                audio_input_feed: None,
            }));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
