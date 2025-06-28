use apalis::prelude::{Data, Error, WorkerBuilder, WorkerFactoryFn};
use chrono::{DateTime, Duration, Utc};
use hypr_db_user::{ListEventFilter, ListEventFilterCommon, ListEventFilterSpecific};

#[allow(unused)]
#[derive(Default, Debug, Clone)]
pub struct Job(DateTime<Utc>);

#[derive(Clone)]
pub struct WorkerState {
    pub db: hypr_db_user::UserDatabase,
    pub user_id: String,
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
    let all_events = ctx
        .db
        .list_events(Some(ListEventFilter {
            common: ListEventFilterCommon {
                user_id: ctx.user_id.clone(),
                limit: Some(10),
            },
            specific: ListEventFilterSpecific::DateRange {
                start: Utc::now() - Duration::minutes(15),
                end: Utc::now() + Duration::minutes(5),
            },
        }))
        .await
        .map_err(|e| crate::Error::Db(e).as_worker_error())?;

    // Use meeting detector to calculate scores for upcoming events
    let meeting_detector = crate::meeting_detection::MeetingDetector::default();
    let meeting_scores = meeting_detector
        .calculate_meeting_scores(&all_events, 20)
        .await;

    // Process high-confidence upcoming meetings for auto-recording
    for score in meeting_scores {
        if score.confidence >= 0.7 {
            // Process calendar event signal through meeting detector
            if let Some(event_id) = &score.event_id {
                let _signal =
                    crate::meeting_detection::MeetingSignal::CalendarEvent(event_id.clone());
                tracing::debug!(
                    "processing_calendar_signal: event_id={}, confidence={}, type={:?}",
                    event_id,
                    score.confidence,
                    score.meeting_type
                );

                // This would integrate with the main app's meeting detector if we had access to it
                // For now, we log the enhanced detection logic
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
