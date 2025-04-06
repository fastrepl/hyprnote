use crate::{ExtensionMapping, ExtensionWidget, ExtensionWidgetKind};

use super::{
    Calendar, ChatGroup, ChatMessage, ChatMessageRole, Event, Human, Organization, Platform,
    Session, Tag, UserDatabase,
};

const USER_MANUAL_MD: &str = include_str!("../assets/manual.md");
const ONBOARDING_RAW_MD: &str = include_str!("../assets/onboarding-raw.md");

pub async fn onboarding(db: &UserDatabase, user_id: impl Into<String>) -> Result<(), crate::Error> {
    let user_id = user_id.into();

    let fastrepl_org = Organization {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Fastrepl".to_string(),
        description: Some("https://github.com/fastrepl".to_string()),
    };

    let fastrepl_members = vec![
        Human {
            id: uuid::Uuid::new_v4().to_string(),
            full_name: Some("Yujong Lee".to_string()),
            email: Some("yujonglee@hyprnote.com".to_string()),
            organization_id: Some(fastrepl_org.id.clone()),
            is_user: false,
            job_title: None,
            linkedin_username: Some("yujong1ee".to_string()),
        },
        Human {
            id: uuid::Uuid::new_v4().to_string(),
            full_name: Some("John Jeong".to_string()),
            email: Some("john@hyprnote.com".to_string()),
            organization_id: Some(fastrepl_org.id.clone()),
            is_user: false,
            job_title: None,
            linkedin_username: Some("johntopia".to_string()),
        },
    ];

    let onboarding_org = Organization {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Dunder Mifflin".to_string(),
        description: None,
    };

    let onboarding_participants = vec![
        Human {
            id: uuid::Uuid::new_v4().to_string(),
            full_name: Some("Michael Scott".to_string()),
            email: None,
            organization_id: Some(onboarding_org.id.clone()),
            is_user: false,
            job_title: None,
            linkedin_username: None,
        },
        Human {
            id: uuid::Uuid::new_v4().to_string(),
            full_name: Some("Ryan Howard".to_string()),
            email: None,
            organization_id: Some(onboarding_org.id.clone()),
            is_user: false,
            job_title: None,
            linkedin_username: None,
        },
        Human {
            id: uuid::Uuid::new_v4().to_string(),
            full_name: Some("Daryl Philbin".to_string()),
            email: None,
            organization_id: Some(onboarding_org.id.clone()),
            is_user: false,
            job_title: None,
            linkedin_username: None,
        },
        Human {
            id: uuid::Uuid::new_v4().to_string(),
            full_name: Some("Toby Flenderson".to_string()),
            email: None,
            organization_id: Some(onboarding_org.id.clone()),
            is_user: false,
            job_title: None,
            linkedin_username: None,
        },
    ];

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
        calendar_id: Some(default_calendar.id.clone()),
        start_date: chrono::Utc::now() + chrono::Duration::minutes(3),
        end_date: chrono::Utc::now() + chrono::Duration::minutes(10),
        google_event_url: None,
    };

    let onboarding_session_id = db.onboarding_session_id();

    let manual_session = Session {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        title: "Welcome to Hyprnote".to_string(),
        created_at: chrono::Utc::now(),
        visited_at: chrono::Utc::now(),
        calendar_event_id: None,
        raw_memo_html: hypr_buffer::opinionated_md_to_html(USER_MANUAL_MD).unwrap(),
        enhanced_memo_html: None,
        conversations: vec![],
    };

    let onboarding_session = Session {
        id: onboarding_session_id,
        user_id: user_id.clone(),
        title: "Onboarding".to_string(),
        created_at: chrono::Utc::now() + chrono::Duration::days(2),
        visited_at: chrono::Utc::now() + chrono::Duration::days(2),
        calendar_event_id: Some(onboarding_event.id.clone()),
        raw_memo_html: hypr_buffer::opinionated_md_to_html(ONBOARDING_RAW_MD).unwrap(),
        enhanced_memo_html: None,
        conversations: vec![],
    };

    let _ = db.upsert_calendar(default_calendar).await?;
    let _ = db.upsert_event(onboarding_event).await?;

    for session in [&manual_session, &onboarding_session] {
        let _ = db.upsert_session(session.clone()).await?;
    }

    for org in [onboarding_org, fastrepl_org] {
        let _ = db.upsert_organization(org).await?;
    }

    for participant in onboarding_participants.clone() {
        let _ = db.upsert_human(participant).await?;
    }

    for member in fastrepl_members.clone() {
        let _ = db.upsert_human(member).await?;
    }

    for participant in onboarding_participants {
        db.session_add_participant(onboarding_session.id.clone(), participant.id)
            .await?;
    }

    for participant in fastrepl_members {
        db.session_add_participant(manual_session.id.clone(), participant.id)
            .await?;
    }

    db.upsert_extension_mapping(ExtensionMapping {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        extension_id: "@hypr/extension-transcript".to_string(),
        config: serde_json::Value::from(r#"{}"#),
        widgets: vec![ExtensionWidget {
            kind: ExtensionWidgetKind::TwoByTwo,
            group: "transcript-default".to_string(),
            position: None,
        }],
    })
    .await?;

    Ok(())
}

#[cfg(debug_assertions)]
pub async fn seed(db: &UserDatabase, user_id: impl Into<String>) -> Result<(), crate::Error> {
    let now = chrono::Utc::now();

    let org_1 = Organization {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Some Company".to_string(),
        description: None,
    };

    let org_2 = Organization {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Boring Company".to_string(),
        description: Some("Boring Company is a tunnel construction company".to_string()),
    };

    let user = Human {
        id: user_id.into(),
        organization_id: Some(org_1.id.clone()),
        is_user: true,
        full_name: None,
        email: None,
        ..Human::default()
    };

    let bobby = Human {
        id: uuid::Uuid::new_v4().to_string(),
        organization_id: Some(org_2.id.clone()),
        job_title: Some("CEO".to_string()),
        full_name: Some("Elon Musk".to_string()),
        email: Some("elon@boringcompany.com".to_string()),
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
        user.clone(),
        bobby.clone(),
        john.clone(),
        alex.clone(),
        jenny.clone(),
    ];

    let calendars = vec![Calendar {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user.clone().id,
        tracking_id: "calendar_1".to_string(),
        name: "Work".to_string(),
        platform: Platform::Apple,
        selected: true,
    }];

    let events = vec![
        // previous
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.clone().id,
            tracking_id: "event_1".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            name: "User Interview with Alex".to_string(),
            note: "Description 1".to_string(),
            start_date: now - chrono::Duration::days(1) - chrono::Duration::hours(1),
            end_date: now - chrono::Duration::days(1),
            google_event_url: None,
        },
        // ongoing
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.clone().id,
            tracking_id: "event_2".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            name: "Seed round pitch".to_string(),
            note: "Description 2".to_string(),
            start_date: now - chrono::Duration::hours(4),
            end_date: now + chrono::Duration::hours(4),
            google_event_url: None,
        },
        // upcoming 1
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.clone().id,
            tracking_id: "event_4".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            name: "Quick chat with Alex".to_string(),
            note: "Description 3".to_string(),
            start_date: now + chrono::Duration::hours(2),
            end_date: now + chrono::Duration::hours(3),
            google_event_url: None,
        },
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.clone().id,
            tracking_id: "event_5".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
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
            ..new_default_session(&user.id)
        },
        Session {
            title: "Session 1".to_string(),
            created_at: now,
            visited_at: now,
            calendar_event_id: Some(events[0].id.clone()),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Session 2".to_string(),
            created_at: now - chrono::Duration::days(1),
            visited_at: now - chrono::Duration::days(1),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Session 3".to_string(),
            created_at: now - chrono::Duration::days(7),
            visited_at: now - chrono::Duration::days(7),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Session 4".to_string(),
            created_at: now - chrono::Duration::days(10),
            visited_at: now - chrono::Duration::days(10),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Session 5".to_string(),
            created_at: now - chrono::Duration::days(34),
            visited_at: now - chrono::Duration::days(34),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Session 6".to_string(),
            created_at: now - chrono::Duration::days(48),
            visited_at: now - chrono::Duration::days(48),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Session 7".to_string(),
            created_at: now - chrono::Duration::days(98),
            visited_at: now - chrono::Duration::days(98),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Session 8".to_string(),
            created_at: now - chrono::Duration::days(148),
            visited_at: now - chrono::Duration::days(148),
            ..new_default_session(&user.id)
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
            user_id: user.clone().id,
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
