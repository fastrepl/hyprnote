use super::{
    Calendar, ChatGroup, ChatMessage, ChatMessageRole, Event, Human, Platform, Session, Tag,
    UserDatabase,
};

pub async fn seed(db: &UserDatabase, user_id: impl Into<String>) -> Result<(), crate::Error> {
    let now = chrono::Utc::now();

    let yujong = Human {
        id: user_id.into(),
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
        // previous
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
        // ongoing
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: yujong.clone().id,
            tracking_id: "event_2".to_string(),
            calendar_id: calendars[0].id.clone(),
            name: "Seed round pitch".to_string(),
            note: "Description 2".to_string(),
            start_date: now + chrono::Duration::days(1) + chrono::Duration::hours(1),
            end_date: now + chrono::Duration::days(1) + chrono::Duration::hours(2),
            google_event_url: None,
        },
        // upcoming
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: yujong.clone().id,
            tracking_id: "event_3".to_string(),
            calendar_id: calendars[0].id.clone(),
            name: "POC with Fastrepl".to_string(),
            note: "Description 3".to_string(),
            start_date: now + chrono::Duration::days(2) + chrono::Duration::hours(1),
            end_date: now + chrono::Duration::days(2) + chrono::Duration::hours(2),
            google_event_url: None,
        },
    ];

    let tags = vec![
        Tag {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Customer".to_string(),
        },
        Tag {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Product".to_string(),
        },
    ];

    let sessions = vec![
        Session {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: yujong.clone().id,
            title: "Session 1".to_string(),
            created_at: now,
            visited_at: now,
            calendar_event_id: Some(events[0].id.clone()),
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
            created_at: now + chrono::Duration::days(1),
            visited_at: now + chrono::Duration::days(1),
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

    for event in events {
        let _ = db.upsert_event(event.clone()).await?;
    }

    for (i, session) in sessions.iter().enumerate() {
        let s = db.upsert_session(session.clone()).await?;

        if i == 0 {
            db.session_add_participant(s.id, &alex.id).await?;
        }
    }

    for tag in tags {
        let _ = db.upsert_tag(tag).await?;
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
