use super::{
    Calendar, ChatGroup, ChatMessage, ChatMessageRole, Event, Human, Organization, Platform,
    Session, Tag, UserDatabase,
};

pub async fn seed2(db: &UserDatabase, user_id: impl Into<String>) -> Result<(), crate::Error> {
    let user_id = user_id.into();

    let default_calendar = Calendar {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        tracking_id: uuid::Uuid::new_v4().to_string(),
        name: "Default".to_string(),
        platform: Platform::Apple,
        selected: false,
    };

    let onboarding_event = Event {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        tracking_id: uuid::Uuid::new_v4().to_string(),
        name: "Onboarding".to_string(),
        note: "".to_string(),
        calendar_id: default_calendar.id.clone(),
        start_date: chrono::Utc::now() + chrono::Duration::minutes(3),
        end_date: chrono::Utc::now() + chrono::Duration::minutes(10),
        google_event_url: None,
    };

    let onboarding_session_id = db.onboarding_session_id().await;

    let session_1 = Session {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        title: "User Manual".to_string(),
        created_at: chrono::Utc::now(),
        visited_at: chrono::Utc::now(),
        calendar_event_id: None,
        raw_memo_html: "TODO".to_string(),
        enhanced_memo_html: None,
        conversations: vec![],
    };

    let session_2 = Session {
        id: onboarding_session_id,
        user_id: user_id.clone(),
        title: "Hyprnote Onboarding".to_string(),
        created_at: chrono::Utc::now() + chrono::Duration::days(2),
        visited_at: chrono::Utc::now() + chrono::Duration::days(2),
        calendar_event_id: Some(onboarding_event.id.clone()),
        raw_memo_html: "TODO".to_string(),
        enhanced_memo_html: None,
        conversations: vec![],
    };

    let _ = db.upsert_calendar(default_calendar).await?;
    let _ = db.upsert_event(onboarding_event).await?;

    for session in [session_1, session_2] {
        let _ = db.upsert_session(session).await?;
    }

    Ok(())
}

pub async fn seed(db: &UserDatabase, user_id: impl Into<String>) -> Result<(), crate::Error> {
    let now = chrono::Utc::now();

    let org_1 = Organization {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Fastrepl".to_string(),
        description: Some("Fastrepl = fast + read-eval-print-loop".to_string()),
    };

    let org_2 = Organization {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Krew Capital".to_string(),
        description: Some(
            "Krew Capital is a venture capital firm that invests in early-stage startups"
                .to_string(),
        ),
    };

    let yujong = Human {
        id: user_id.into(),
        organization_id: Some(org_1.id.clone()),
        is_user: true,
        full_name: Some("Yujong Lee".to_string()),
        email: Some("yujonglee@hyprnote.com".to_string()),
        ..Human::default()
    };

    let bobby = Human {
        id: uuid::Uuid::new_v4().to_string(),
        organization_id: Some(org_2.id.clone()),
        job_title: Some("Partner".to_string()),
        full_name: Some("Bobby Min".to_string()),
        email: Some("bobby.min@krewcapital.com".to_string()),
        ..Human::default()
    };

    let minjae = Human {
        id: uuid::Uuid::new_v4().to_string(),
        organization_id: Some(org_2.id.clone()),
        job_title: Some("Partner".to_string()),
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

    let humans = vec![
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
            start_date: now - chrono::Duration::hours(4),
            end_date: now + chrono::Duration::hours(4),
            google_event_url: None,
        },
        // upcoming 1
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: yujong.clone().id,
            tracking_id: "event_4".to_string(),
            calendar_id: calendars[0].id.clone(),
            name: "Quick chat with Alex".to_string(),
            note: "Description 3".to_string(),
            start_date: now + chrono::Duration::hours(2),
            end_date: now + chrono::Duration::hours(3),
            google_event_url: None,
        },
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: yujong.clone().id,
            tracking_id: "event_5".to_string(),
            calendar_id: calendars[0].id.clone(),
            name: "Litellm dev meeting".to_string(),
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
            title: "Session 0".to_string(),
            created_at: now - chrono::Duration::hours(1),
            visited_at: now - chrono::Duration::hours(1),
            ..new_default_session(&yujong.id)
        },
        Session {
            title: "Session 1".to_string(),
            created_at: now,
            visited_at: now,
            calendar_event_id: Some(events[0].id.clone()),
            ..new_default_session(&yujong.id)
        },
        Session {
            title: "Session 2".to_string(),
            created_at: now - chrono::Duration::days(1),
            visited_at: now - chrono::Duration::days(1),
            ..new_default_session(&yujong.id)
        },
        Session {
            title: "Session 3".to_string(),
            created_at: now - chrono::Duration::days(7),
            visited_at: now - chrono::Duration::days(7),
            ..new_default_session(&yujong.id)
        },
        Session {
            title: "Session 4".to_string(),
            created_at: now - chrono::Duration::days(10),
            visited_at: now - chrono::Duration::days(10),
            ..new_default_session(&yujong.id)
        },
        Session {
            title: "Session 5".to_string(),
            created_at: now - chrono::Duration::days(34),
            visited_at: now - chrono::Duration::days(34),
            ..new_default_session(&yujong.id)
        },
        Session {
            title: "Session 6".to_string(),
            created_at: now - chrono::Duration::days(48),
            visited_at: now - chrono::Duration::days(48),
            ..new_default_session(&yujong.id)
        },
        Session {
            title: "Session 7".to_string(),
            created_at: now - chrono::Duration::days(98),
            visited_at: now - chrono::Duration::days(98),
            ..new_default_session(&yujong.id)
        },
        Session {
            title: "Session 8".to_string(),
            created_at: now - chrono::Duration::days(148),
            visited_at: now - chrono::Duration::days(148),
            ..new_default_session(&yujong.id)
        },
    ];

    for org in [org_1, org_2] {
        db.upsert_organization(org).await?;
    }

    for human in humans {
        db.upsert_human(human).await?;
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

fn new_default_session(user_id: impl Into<String>) -> Session {
    let now = chrono::Utc::now();

    Session {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.into(),
        title: "".to_string(),
        created_at: now,
        visited_at: now,
        calendar_event_id: None,
        raw_memo_html: "".to_string(),
        enhanced_memo_html: None,
        conversations: vec![],
    }
}
