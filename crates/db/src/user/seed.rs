use super::{Calendar, Event, Human, Platform, Session, UserDatabase};

pub async fn seed(db: &UserDatabase) -> Result<(), crate::Error> {
    let now = chrono::Utc::now();

    let yujong = Human {
        id: uuid::Uuid::new_v4().to_string(),
        is_user: true,
        name: Some("Yujong Lee".to_string()),
        email: Some("yujonglee@hyprnote.com".to_string()),
        ..Human::default()
    };

    let bobby = Human {
        name: Some("Bobby Min".to_string()),
        email: Some("bobby.min@krewcapital.com".to_string()),
        ..Human::default()
    };

    let minjae = Human {
        name: Some("Minjae Song".to_string()),
        email: Some("minjae.song@krewcapital.com".to_string()),
        ..Human::default()
    };

    let john = Human {
        name: Some("John Jeong".to_string()),
        email: Some("john@hyprnote.com".to_string()),
        ..Human::default()
    };

    let alex = Human {
        name: Some("Alex Karp".to_string()),
        email: Some("alex@hyprnote.com".to_string()),
        ..Human::default()
    };

    let jenny = Human {
        name: Some("Jenny Park".to_string()),
        email: Some("jenny@hyprnote.com".to_string()),
        ..Human::default()
    };

    let participants = vec![yujong, bobby, minjae, john, alex, jenny];
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
            start_date: now - chrono::Duration::days(1) - chrono::Duration::hours(1),
            end_date: now - chrono::Duration::days(1),
            google_event_url: None,
        },
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "event_2".to_string(),
            calendar_id: calendars[0].id.clone(),
            name: "Seed round pitch - Krew Capital".to_string(),
            note: "Description 2".to_string(),
            start_date: now + chrono::Duration::days(1) + chrono::Duration::hours(1),
            end_date: now + chrono::Duration::days(1) + chrono::Duration::hours(2),
            google_event_url: None,
        },
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "event_3".to_string(),
            calendar_id: calendars[0].id.clone(),
            name: "Event 3".to_string(),
            note: "Description 3".to_string(),
            start_date: now + chrono::Duration::days(1) + chrono::Duration::hours(1),
            end_date: now + chrono::Duration::days(1) + chrono::Duration::hours(2),
            google_event_url: None,
        },
    ];

    let sessions = vec![
        Session {
            title: "Session 1".to_string(),
            tags: vec!["test".to_string()],
            conversations: vec![],
            ..Session::default()
        },
        Session {
            title: "Session 2".to_string(),
            tags: vec!["test".to_string()],
            conversations: vec![],
            ..Session::default()
        },
    ];

    // TODO

    // for calendar in calendars {
    //     let _ = db.upsert_calendar(calendar).await.unwrap();
    // }
    // for participant in participants {
    //     let _ = db.add_participant(participant).await.unwrap();
    // }
    // for event in events {
    //     let _ = db.upsert_event(event.clone()).await.unwrap();
    //     db.event_set_participants(event.id.clone(), participant_ids.clone())
    //         .await
    //         .unwrap();
    // }
    // for session in sessions {
    //     let _ = db.upsert_session(session).await.unwrap();
    // }

    Ok(())
}
