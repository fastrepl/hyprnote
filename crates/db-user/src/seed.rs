use super::{
    Calendar, ChatGroup, ChatMessage, ChatMessageRole, Event, Human, Platform, Session,
    UserDatabase,
};

pub async fn seed(db: &UserDatabase) -> Result<(), crate::Error> {
    let now = chrono::Utc::now();

    let yujong = Human {
        id: uuid::Uuid::new_v4().to_string(),
        is_user: true,
        full_name: Some("Yujong Lee".to_string()),
        email: Some("yujonglee@hyprnote.com".to_string()),
        ..Human::default()
    };

    let bobby = Human {
        full_name: Some("Bobby Min".to_string()),
        email: Some("bobby.min@krewcapital.com".to_string()),
        ..Human::default()
    };

    let minjae = Human {
        full_name: Some("Minjae Song".to_string()),
        email: Some("minjae.song@krewcapital.com".to_string()),
        ..Human::default()
    };

    let john = Human {
        full_name: Some("John Jeong".to_string()),
        email: Some("john@hyprnote.com".to_string()),
        ..Human::default()
    };

    let alex = Human {
        full_name: Some("Alex Karp".to_string()),
        email: Some("alex@hyprnote.com".to_string()),
        ..Human::default()
    };

    let jenny = Human {
        full_name: Some("Jenny Park".to_string()),
        email: Some("jenny@hyprnote.com".to_string()),
        ..Human::default()
    };

    let participants = vec![
        yujong.clone(),
        bobby.clone(),
        minjae.clone(),
        john.clone(),
        alex.clone(),
        jenny.clone(),
    ];

    let calendars = vec![Calendar {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: yujong.clone().id,
        tracking_id: "calendar_1".to_string(),
        name: "Work".to_string(),
        platform: Platform::Apple,
        selected: true,
    }];

    let events = vec![
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: yujong.clone().id,
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
            user_id: yujong.clone().id,
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
            user_id: yujong.clone().id,
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
            id: uuid::Uuid::new_v4().to_string(),
            user_id: yujong.clone().id,
            title: "Session 1".to_string(),
            timestamp: now,
            calendar_event_id: None,
            audio_local_path: None,
            audio_remote_path: None,
            raw_memo_html: "".to_string(),
            enhanced_memo_html: None,
            conversations: vec![],
        },
        Session {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: yujong.clone().id,
            title: "Session 2".to_string(),
            timestamp: now + chrono::Duration::days(1),
            calendar_event_id: None,
            audio_local_path: None,
            audio_remote_path: None,
            raw_memo_html: "".to_string(),
            enhanced_memo_html: None,
            conversations: vec![],
        },
    ];

    for participant in participants.clone() {
        db.upsert_human(participant).await?;
    }

    for calendar in calendars {
        db.upsert_calendar(calendar).await?;
    }

    // FOREIGN KEY constraint failed
    // for event in events {
    //     let _ = db.upsert_event(event.clone()).await?;
    //     for participant in participants.iter() {
    //         db.add_participant(event.id.clone(), participant.id.clone())
    //             .await?;
    //     }
    // }

    for session in sessions {
        let _ = db.upsert_session(session).await?;
    }

    {
        let chat_group_1 = ChatGroup {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: yujong.clone().id,
            name: Some("Chat Group 1".to_string()),
            created_at: now,
        };

        let _ = db.create_chat_group(chat_group_1.clone()).await?;

        let chat_message_1 = ChatMessage {
            id: uuid::Uuid::new_v4().to_string(),
            group_id: chat_group_1.id.clone(),
            role: ChatMessageRole::User,
            content: "Hello, how are you?".to_string(),
            created_at: now,
        };

        let _ = db.upsert_chat_message(chat_message_1).await?;
    }

    Ok(())
}
