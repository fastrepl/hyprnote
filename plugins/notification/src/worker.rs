use apalis::prelude::{Data, Error, WorkerBuilder, WorkerFactoryFn};
use chrono::{DateTime, Duration, Utc};
use hypr_db_user::{ListEventFilter, ListEventFilterCommon, ListEventFilterSpecific};
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct NotificationConfig {
    pub event_limit: i32,
    pub meeting_score_threshold: i64,
    pub confidence_threshold: f64,
}

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            event_limit: std::env::var("NOTIFICATION_EVENT_LIMIT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10),
            meeting_score_threshold: std::env::var("NOTIFICATION_MEETING_SCORE_THRESHOLD")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(20),
            confidence_threshold: std::env::var("NOTIFICATION_CONFIDENCE_THRESHOLD")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0.7),
        }
    }
}

#[allow(unused)]
#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

#[derive(Clone)]
pub struct WorkerState {
    pub db: hypr_db_user::UserDatabase,
    pub user_id: String,
    pub config: Arc<NotificationConfig>,
    pub meeting_detector: crate::meeting_detection::MeetingDetector,
}

impl From<DateTime<Utc>> for Job {
    fn from(t: DateTime<Utc>) -> Self {
        Job(t)
    }
}

const EVENT_NOTIFICATION_WORKER_NAKE: &str = "event_notification_worker";

#[tracing::instrument(skip(ctx), name = EVENT_NOTIFICATION_WORKER_NAKE)]
pub async fn perform_event_notification(_job: Job, ctx: Data<WorkerState>) -> Result<(), Error> {
    let latest_event = ctx
        .db
        .list_events(Some(ListEventFilter {
            common: ListEventFilterCommon {
                user_id: ctx.user_id.clone(),
                limit: Some(1),
            },
            specific: ListEventFilterSpecific::DateRange {
                start: Utc::now(),
                end: Utc::now() + Duration::minutes(5),
            },
        }))
        .await
        .map_err(|e| crate::Error::Db(e).as_worker_error())?;

    if let Some(event) = latest_event.first() {
        hypr_notification2::show(hypr_notification2::Notification {
            title: "Meeting starting in 5 minutes".to_string(),
            message: event.name.clone(),
            url: Some(format!("hypr://notification?event_id={}", event.id)),
            timeout: Some(std::time::Duration::from_secs(10)),
        });
    }

    // Enhanced auto-start logic with meeting detection integration
    let event_limit = ctx.config.event_limit.try_into().unwrap_or_else(|e| {
        tracing::warn!(
            "invalid_event_limit: value={}, error={:?}, using_default=10",
            ctx.config.event_limit,
            e
        );
        10 // Safe default fallback
    });

    let all_events = ctx
        .db
        .list_events(Some(ListEventFilter {
            common: ListEventFilterCommon {
                user_id: ctx.user_id.clone(),
                limit: Some(event_limit),
            },
            specific: ListEventFilterSpecific::DateRange {
                start: Utc::now() - Duration::minutes(15),
                end: Utc::now() + Duration::minutes(5),
            },
        }))
        .await
        .map_err(|e| crate::Error::Db(e).as_worker_error())?;

    // Update meeting detector with current events for temporal calculations
    ctx.meeting_detector.update_events(all_events.clone());

    // Use shared meeting detector to calculate scores for upcoming events
    let meeting_scores = ctx
        .meeting_detector
        .calculate_meeting_scores(&all_events, ctx.config.meeting_score_threshold)
        .await;

    // Process high-confidence upcoming meetings for auto-recording
    for score in meeting_scores {
        if score.confidence >= ctx.config.confidence_threshold {
            // Process calendar event signal through meeting detector
            if let Some(event_id) = &score.event_id {
                let signal =
                    crate::meeting_detection::MeetingSignal::CalendarEvent(event_id.clone());

                // Process the signal through the shared meeting detector for enhanced correlation analysis
                if let Some(enhanced_score) = ctx.meeting_detector.process_signal(signal) {
                    tracing::info!(
                        "meeting_signal_processed: event_id={}, original_confidence={:.2}, enhanced_confidence={:.2}, type={:?}",
                        event_id,
                        score.confidence,
                        enhanced_score.confidence,
                        enhanced_score.meeting_type
                    );

                    // The meeting detector may have triggered auto-recording based on enhanced signals
                    if enhanced_score.confidence > score.confidence {
                        tracing::info!(
                            "meeting_confidence_enhanced: event_id={}, boost={:.2}",
                            event_id,
                            enhanced_score.confidence - score.confidence
                        );
                    }
                } else {
                    tracing::debug!(
                        "meeting_signal_not_processed: event_id={}, confidence={}, type={:?}",
                        event_id,
                        score.confidence,
                        score.meeting_type
                    );
                }
            }
        }
    }

    Ok(())
}

pub async fn monitor(state: WorkerState) -> Result<(), std::io::Error> {
    use std::str::FromStr;

    apalis::prelude::Monitor::new()
        .register({
            WorkerBuilder::new(EVENT_NOTIFICATION_WORKER_NAKE)
                .data(state.clone())
                .backend(apalis_cron::CronStream::new(
                    apalis_cron::Schedule::from_str("0 * * * * *").unwrap(),
                ))
                .build_fn(perform_event_notification)
        })
        .run()
        .await?;

    Ok(())
}
