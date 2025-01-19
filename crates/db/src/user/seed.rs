use super::{Calendar, Event, Participant, Platform, Session, Transcript, UserDatabase};
use time::Duration;

pub async fn seed(db: &UserDatabase) -> anyhow::Result<()> {
    let now = time::OffsetDateTime::now_local().unwrap();

    let yujonglee = Participant {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Yujong Lee".to_string(),
        email: Some("yujonglee@hyprnote.com".to_string()),
        color_hex: random_color::RandomColor::new().to_hex(),
    };

    let john = Participant {
        id: uuid::Uuid::new_v4().to_string(),
        name: "John".to_string(),
        email: Some("john@hyprnote.com".to_string()),
        color_hex: random_color::RandomColor::new().to_hex(),
    };

    let alex = Participant {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Alex".to_string(),
        email: Some("alex@hyprnote.com".to_string()),
        color_hex: random_color::RandomColor::new().to_hex(),
    };

    let jenny = Participant {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Jenny".to_string(),
        email: None,
        color_hex: random_color::RandomColor::new().to_hex(),
    };

    let participants = vec![yujonglee, john, alex, jenny];
    let participant_ids: Vec<String> = participants.iter().map(|p| p.id.clone()).collect();

    let calendars = vec![Calendar {
        id: uuid::Uuid::new_v4().to_string(),
        tracking_id: "calendar_1".to_string(),
        name: "Work".to_string(),
        platform: Platform::Apple,
        selected: true,
    }];

    let events = vec![
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "event_1".to_string(),
            calendar_id: calendars[0].id.clone(),
            name: "User Interview with Alex".to_string(),
            note: "Description 1".to_string(),
            start_date: now - Duration::days(1) - Duration::hours(1),
            end_date: now - Duration::days(1),
            google_event_url: None,
        },
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "event_2".to_string(),
            calendar_id: calendars[0].id.clone(),
            name: "Event 2".to_string(),
            note: "Description 2".to_string(),
            start_date: now + Duration::days(1) + Duration::hours(1),
            end_date: now + Duration::days(1) + Duration::hours(2),
            google_event_url: None,
        },
    ];

    let sessions = vec![
        Session {
            title: "Session 1".to_string(),
            tags: vec!["test".to_string()],
            transcript: Some(Transcript {
                speakers: vec![],
                blocks: vec![],
            }),
            ..Session::default()
        },
        Session {
            title: "Session 2".to_string(),
            tags: vec!["test".to_string()],
            transcript: Some(Transcript {
                speakers: vec![],
                blocks: vec![],
            }),
            ..Session::default()
        },
    ];

    for calendar in calendars {
        let _ = db.upsert_calendar(calendar).await.unwrap();
    }
    for participant in participants {
        let _ = db.upsert_participant(participant).await.unwrap();
    }
    for event in events {
        let _ = db.upsert_event(event.clone()).await.unwrap();
        db.event_set_participants(event.id.clone(), participant_ids.clone())
            .await
            .unwrap();
    }
    for session in sessions {
        let _ = db.upsert_session(session).await.unwrap();
    }

    Ok(())
}
