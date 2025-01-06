// use super::{Calendar, Event, Participant, Platform, Session, Transcript, UserDatabase};
use super::UserDatabase;
use time::Duration;

pub async fn seed(db: &UserDatabase) -> anyhow::Result<()> {
    // let now = time::OffsetDateTime::now_local().unwrap();

    // let yujonglee = Participant {
    //     id: 1,
    //     name: "Yujong Lee".to_string(),
    //     email: "yujonglee@hyprnote.com".to_string(),
    //     color_hex: random_color::RandomColor::new().to_hex(),
    // };

    // let john = Participant {
    //     id: 2,
    //     name: "John".to_string(),
    //     email: "john@hyprnote.com".to_string(),
    //     color_hex: random_color::RandomColor::new().to_hex(),
    // };

    // let calendars = vec![Calendar {
    //     id: "calendar_1".to_string(),
    //     name: "Work".to_string(),
    //     platform: Platform::Apple,
    // }];

    // let events = vec![
    //     Event {
    //         id: "event_1".to_string(),
    //         calendar_id: "calendar_1".to_string(),
    //         platform: Platform::Apple,
    //         name: "Event 1".to_string(),
    //         note: "Description 1".to_string(),
    //         start_date: now - Duration::days(1) - Duration::hours(1),
    //         end_date: now - Duration::days(1),
    //         google_event_url: None,
    //     },
    //     Event {
    //         id: "event_2".to_string(),
    //         calendar_id: "calendar_1".to_string(),
    //         platform: Platform::Apple,
    //         name: "Event 2".to_string(),
    //         note: "Description 2".to_string(),
    //         start_date: now + Duration::days(1) + Duration::hours(1),
    //         end_date: now + Duration::days(1) + Duration::hours(2),
    //         google_event_url: None,
    //     },
    //     Event {
    //         id: "event_3".to_string(),
    //         calendar_id: "calendar_1".to_string(),
    //         platform: Platform::Apple,
    //         name: "Event 3".to_string(),
    //         note: "Description 3".to_string(),
    //         start_date: now + Duration::days(1) + Duration::hours(1),
    //         end_date: now + Duration::days(1) + Duration::hours(2),
    //         google_event_url: None,
    //     },
    //     Event {
    //         id: "event_4".to_string(),
    //         calendar_id: "calendar_1".to_string(),
    //         platform: Platform::Apple,
    //         name: "Event 4".to_string(),
    //         note: "Description 4".to_string(),
    //         start_date: now + Duration::days(1) + Duration::hours(1),
    //         end_date: now + Duration::days(1) + Duration::hours(2),
    //         google_event_url: None,
    //     },
    //     Event {
    //         id: "event_5".to_string(),
    //         calendar_id: "calendar_1".to_string(),
    //         platform: Platform::Apple,
    //         name: "Event 5".to_string(),
    //         note: "Description 5".to_string(),
    //         start_date: now + Duration::days(1) + Duration::hours(1),
    //         end_date: now + Duration::days(1) + Duration::hours(2),
    //         google_event_url: None,
    //     },
    // ];

    // let sessions = vec![
    //     Session {
    //         title: "Session 1".to_string(),
    //         tags: vec!["test".to_string()],
    //         transcript: Some(Transcript {
    //             speakers: vec![],
    //             blocks: vec![],
    //         }),
    //         ..Session::default()
    //     },
    //     Session {
    //         title: "Session 2".to_string(),
    //         tags: vec!["test".to_string()],
    //         transcript: Some(Transcript {
    //             speakers: vec![],
    //             blocks: vec![],
    //         }),
    //         ..Session::default()
    //     },
    // ];

    // for calendar in calendars {
    //     let _ = db.upsert_calendar(calendar).await.unwrap();
    // }
    // for event in events {
    //     let _ = db.upsert_event(event).await.unwrap();
    // }
    // for session in sessions {
    //     let _ = db.create_session(session).await.unwrap();
    // }

    Ok(())
}
