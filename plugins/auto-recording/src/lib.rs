mod commands;
mod error;
mod ext;

use std::sync::Mutex;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use error::Error;
pub use ext::AutoRecordingPluginExt;

const PLUGIN_NAME: &str = "auto-recording";

#[derive(Default)]
pub struct SharedState {
    detector: Option<hypr_meeting_detector::MeetingDetector>,
}

type ManagedState = Mutex<SharedState>;

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new().commands(tauri_specta::collect_commands![
        commands::get_auto_recording_enabled,
        commands::set_auto_recording_enabled,
        commands::get_auto_record_on_scheduled,
        commands::set_auto_record_on_scheduled,
        commands::get_auto_record_on_ad_hoc,
        commands::set_auto_record_on_ad_hoc,
        commands::get_notify_before_meeting,
        commands::set_notify_before_meeting,
        commands::get_require_window_focus,
        commands::set_require_window_focus,
        commands::get_minutes_before_notification,
        commands::set_minutes_before_notification,
        commands::get_auto_stop_on_meeting_end,
        commands::set_auto_stop_on_meeting_end,
        commands::get_detection_confidence_threshold,
        commands::set_detection_confidence_threshold,
        commands::start_auto_recording_monitor,
        commands::stop_auto_recording_monitor,
        commands::get_active_meetings,
    ])
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            app.manage(ManagedState::default());

            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;

                if app.get_auto_recording_enabled().unwrap_or(false) {
                    if let Err(e) = app.start_auto_recording_monitor().await {
                        tracing::error!("Failed to start auto-recording monitor on startup: {}", e);
                    }
                }
            });

            Ok(())
        })
        .build()
}

#[cfg(debug_assertions)]
pub fn export_types() -> tauri_specta::Builder<tauri::Wry> {
    make_specta_builder()
}

pub async fn handle_meeting_event<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    event: hypr_meeting_detector::MeetingEvent,
) -> Result<(), Error> {
    use hypr_meeting_detector::MeetingEvent;

    match event {
        MeetingEvent::AdHocMeetingDetected(meeting) => {
            if !app.get_auto_record_on_ad_hoc()? {
                return Ok(());
            }

            // Check confidence threshold
            let threshold = app.get_detection_confidence_threshold().unwrap_or(0.7);
            if meeting.confidence < threshold {
                tracing::info!(
                    "Meeting confidence ({:.2}) below threshold ({:.2}), skipping auto-recording",
                    meeting.confidence,
                    threshold
                );
                return Ok(());
            }

            if app.get_notify_before_meeting()? {
                let notification = hypr_notification2::Notification {
                    title: "Meeting detected".to_string(),
                    message: format!(
                        "Detected {} meeting{}. Start recording? (Confidence: {:.0}%)",
                        meeting.app.name,
                        if let Some(ref title) = meeting.window_title {
                            format!(" ({})", title)
                        } else {
                            String::new()
                        },
                        meeting.confidence * 100.0
                    ),
                    url: Some("hypr://auto-recording/meeting-detected".to_string()),
                    timeout: Some(std::time::Duration::from_secs(10)),
                };
                hypr_notification2::show(notification);

                // Brief delay to show notification before auto-starting
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }

            app.trigger_recording_for_meeting(meeting.app.bundle_id)
                .await?;
        }

        MeetingEvent::ScheduledMeetingStarting(meeting) => {
            if !app.get_auto_record_on_scheduled()? {
                return Ok(());
            }

            if app.get_notify_before_meeting()? {
                let minutes_before = app.get_minutes_before_notification()?;
                let notification = hypr_notification2::Notification {
                    title: format!("Meeting starting in {} minutes", minutes_before),
                    message: format!(
                        "'{}' is about to begin. Preparing to start recording...",
                        meeting.title
                    ),
                    url: Some("hypr://app/new?record=true".to_string()),
                    timeout: Some(std::time::Duration::from_secs(15)),
                };
                hypr_notification2::show(notification);
            }

            // Start recording immediately for scheduled meetings
            app.trigger_recording_for_meeting(meeting.id).await?;
        }

        MeetingEvent::ScheduledMeetingEnded(meeting) => {
            // Check if auto-stop is enabled
            if app.get_auto_stop_on_meeting_end().unwrap_or(true) {
                app.stop_recording_for_meeting(meeting.id.clone()).await?;

                let notification = hypr_notification2::Notification {
                    title: "Meeting ended".to_string(),
                    message: format!("'{}' has ended. Recording stopped.", meeting.title),
                    url: Some("hypr://app".to_string()),
                    timeout: Some(std::time::Duration::from_secs(8)),
                };
                hypr_notification2::show(notification);
            } else {
                tracing::info!("Meeting ended but auto-stop disabled: {}", meeting.title);
            }
        }

        MeetingEvent::MeetingAppClosed(bundle_id) => {
            tracing::info!("Meeting app closed: {}", bundle_id);
            // Check if auto-stop is enabled before stopping recording
            if app.get_auto_stop_on_meeting_end().unwrap_or(true) {
                app.stop_recording_for_meeting(bundle_id).await?;
            }
        }
    }

    Ok(())
}

pub async fn get_upcoming_meetings(
    db: &hypr_db_user::Db,
    user_id: &str,
) -> Result<Vec<hypr_meeting_detector::ScheduledMeeting>, Error> {
    use chrono::{Duration, Utc};

    let now = Utc::now();
    let end_time = now + Duration::hours(24);

    let events = db
        .list_events_between(user_id, now, end_time, Some(100))
        .await?;

    let mut meetings = Vec::new();
    for event in events {
        let participants = event.participants.into_iter().map(|p| p.name).collect();

        meetings.push(hypr_meeting_detector::ScheduledMeeting {
            id: event.id,
            title: event.name,
            start_time: event.start_date,
            end_time: event.end_date,
            participants,
            is_upcoming: event.start_date > now,
        });
    }

    Ok(meetings)
}
