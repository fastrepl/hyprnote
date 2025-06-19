use crate::{Config, ConfigAI, ConfigGeneral, ConfigNotification};

use super::{
    Calendar, ChatGroup, ChatMessage, ChatMessageRole, Event, Human, Organization, Platform,
    Session, Tag, UserDatabase,
};

const ONBOARDING_RAW_HTML: &str = include_str!("../assets/onboarding-raw.html");
const THANK_YOU_MD: &str = include_str!("../assets/thank-you.md");

pub async fn onboarding(db: &UserDatabase, user_id: impl Into<String>) -> Result<(), crate::Error> {
    let user_id = user_id.into();

    let fastrepl_org = Organization {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Fastrepl".to_string(),
        description: Some("https://github.com/fastrepl".to_string()),
    };

    let fastrepl_john = Human {
        id: uuid::Uuid::new_v4().to_string(),
        full_name: Some("John Jeong".to_string()),
        email: Some("john@hyprnote.com".to_string()),
        organization_id: Some(fastrepl_org.id.clone()),
        is_user: false,
        job_title: None,
        linkedin_username: Some("johntopia".to_string()),
    };

    let fastrepl_yujong = Human {
        id: uuid::Uuid::new_v4().to_string(),
        full_name: Some("Yujong Lee".to_string()),
        email: Some("yujonglee@hyprnote.com".to_string()),
        organization_id: Some(fastrepl_org.id.clone()),
        is_user: false,
        job_title: None,
        linkedin_username: Some("yujong1ee".to_string()),
    };

    let default_calendar = Calendar {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        tracking_id: uuid::Uuid::new_v4().to_string(),
        name: "Default".to_string(),
        platform: Platform::Apple,
        selected: false,
        source: None,
    };

    let onboarding_event = Event {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        tracking_id: uuid::Uuid::new_v4().to_string(),
        name: "Welcome to Hyprnote".to_string(),
        note: "".to_string(),
        calendar_id: Some(default_calendar.id.clone()),
        participants: vec![],
        start_date: chrono::Utc::now() + chrono::Duration::minutes(3),
        end_date: chrono::Utc::now() + chrono::Duration::minutes(10),
        google_event_url: None,
    };

    let onboarding_session_id = db.onboarding_session_id();

    let thank_you_session = Session {
        title: "Thank you".to_string(),
        raw_memo_html: hypr_buffer::opinionated_md_to_html(THANK_YOU_MD).unwrap(),
        ..new_default_session(&user_id)
    };

    let onboarding_session = Session {
        id: onboarding_session_id,
        title: "Welcome to Hyprnote".to_string(),
        calendar_event_id: Some(onboarding_event.id.clone()),
        raw_memo_html: ONBOARDING_RAW_HTML.to_string(),
        ..new_default_session(&user_id)
    };

    let _ = db.upsert_calendar(default_calendar).await?;
    let _ = db.upsert_event(onboarding_event).await?;

    for session in [&thank_you_session, &onboarding_session] {
        let _ = db.upsert_session(session.clone()).await?;
    }

    for org in [fastrepl_org] {
        let _ = db.upsert_organization(org).await?;
    }

    for member in [&fastrepl_john, &fastrepl_yujong] {
        let _ = db.upsert_human(member.clone()).await?;
    }

    for participant in [&fastrepl_john, &fastrepl_yujong] {
        db.session_add_participant(&thank_you_session.id, &participant.id)
            .await?;
    }

    db.session_add_participant(&onboarding_session.id, &fastrepl_john.id)
        .await?;

    db.set_config(Config {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.clone(),
        general: ConfigGeneral {
            jargons: vec![
                "smart notepad".to_string(),
                "offline".to_string(),
                "privacy".to_string(),
                "X".to_string(),
                "CRM".to_string(),
                "Twenty".to_string(),
                "Discord".to_string(),
                "Hyprnote".to_string(),
            ],
            ..Default::default()
        },
        notification: ConfigNotification::default(),
        ai: ConfigAI::default(),
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

    let humans = vec![user.clone(), bobby.clone(), alex.clone(), jenny.clone()];

    let calendars = vec![Calendar {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user.clone().id,
        tracking_id: "calendar_1".to_string(),
        name: "Work".to_string(),
        platform: Platform::Apple,
        selected: true,
        source: None,
    }];

    let events = vec![
        // --- Events for EventsList --- (Sorted by start_date in UI)
        // Today, linked to a session (created below)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Daily Standup".to_string(),
            note: indoc::indoc! {r#"
                What:
                30 Min Meeting between Alice Smith and Bob Johnson
                Invitee Time Zone:
                Asia/Seoul
                Who:
                Alice Smith - Organizer
                alice.smith@example.com
                Bob Johnson
                bob.johnson@example.com
                Where:
                https://app.cal.com/video/d713v9w1d2krBptPtwUAnJ
                Need to reschedule or cancel? https://cal.com/booking/d713v9w1d2krBptPtwUAnJ?changes=true
            "#}.to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            participants: vec![],
            start_date: now + chrono::Duration::minutes(15),
            end_date: now + chrono::Duration::minutes(30),
            google_event_url: None,
        },
        // --- Past Events for linking to NotesList ---
        // Last Month
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Project Kickoff (Past)".to_string(),
            note: "Initial meeting for Project Phoenix.".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            participants: vec![],
            start_date: now - chrono::Duration::days(7),
            end_date: now - chrono::Duration::days(7) + chrono::Duration::hours(1),
            google_event_url: None,
        },
        // Ten Days Ago
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Q3 Strategy Meeting (Past)".to_string(),
            note: "Quarterly planning session.".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            participants: vec![],
            start_date: now - chrono::Duration::days(10),
            end_date: now - chrono::Duration::days(10) + chrono::Duration::hours(2),
            google_event_url: None,
        },
        // Event without Session attached
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Random Thoughts".to_string(),
            note: "Random thoughts...".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            participants: vec![],
            start_date: now - chrono::Duration::days(14),
            end_date: now - chrono::Duration::days(14) + chrono::Duration::hours(1),
            google_event_url: None,
        },
        // Event without Session attached
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Quick Brainstorm".to_string(),
            note: "Ideas for the new feature".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            participants: vec![],
            start_date: now - chrono::Duration::days(10),
            end_date: now - chrono::Duration::days(10) + chrono::Duration::hours(1),
            google_event_url: None,
        },
        // Event without Session attached
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Follow-up Thoughts".to_string(),
            note: "Further reflections on yesterday's meeting".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            participants: vec![],
            start_date: now - chrono::Duration::days(1),
            end_date: now - chrono::Duration::days(1) + chrono::Duration::minutes(30),
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

    // Get IDs of specific events for linking sessions
    let daily_standup_event_id = events[0].id.clone(); // Assumes Daily Standup is the first event
    let past_kickoff_event_id = events[1].id.clone(); // Project Kickoff (Past) event

    let sessions = vec![
        // --- Sessions for NotesList --- (Sorted by created_at desc in UI group)
        // Today, linked to Daily Standup event
        Session {
            title: "Daily Standup Notes".to_string(),
            created_at: now,
            visited_at: now,
            calendar_event_id: Some(daily_standup_event_id),
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Blockers\n- API integration delay\n### Progress\n- UI components done",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // Today, not linked to an event
        Session {
            title: "Quick Thoughts".to_string(),
            created_at: now - chrono::Duration::minutes(5),
            visited_at: now - chrono::Duration::minutes(5),
            calendar_event_id: None,
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "- Remember to call John\n- Check email for invoice",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // Yesterday, not linked
        Session {
            title: "Meeting with Client X".to_string(),
            created_at: now - chrono::Duration::days(1),
            visited_at: now - chrono::Duration::days(1),
            calendar_event_id: None,
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "**Action Items**\n- Send proposal by EOD Friday",
            )
            .unwrap(),
            enhanced_memo_html: Some(
                hypr_buffer::opinionated_md_to_html(
                    "**Action Items**\n- Send proposal by EOD Friday",
                )
                .unwrap(),
            ),
            words: {
                let words = serde_json::from_str::<Vec<hypr_listener_interface::Word>>(
                    &hypr_data::english_4::WORDS_JSON,
                )
                .unwrap();
                let mut repeated = Vec::with_capacity(words.len() * 100);
                for _ in 0..100 {
                    repeated.extend(words.clone());
                }
                repeated
            },
            ..new_default_session(&user.id)
        },
        // Last week, not linked, untitled
        Session {
            title: "".to_string(), // Untitled
            created_at: now - chrono::Duration::days(6),
            visited_at: now - chrono::Duration::days(6),
            calendar_event_id: None,
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "Just some random notes from last week.",
            )
            .unwrap(),
            words: serde_json::from_str::<Vec<hypr_listener_interface::Word>>(
                &hypr_data::english_4::WORDS_JSON,
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // Last month, linked to past Project Kickoff event
        Session {
            title: "Project Phoenix Kickoff Notes".to_string(),
            created_at: now - chrono::Duration::days(35),
            visited_at: now - chrono::Duration::days(35),
            calendar_event_id: Some(past_kickoff_event_id),
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Goals\n- Launch by Q4\n### Risks\n- Resource constraints",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // --- Older Sessions for Grouping/Scrolling Test ---
        Session {
            title: "Old Ideas".to_string(),
            created_at: now - chrono::Duration::days(40),
            visited_at: now - chrono::Duration::days(40),
            calendar_event_id: None, // Not linked
            ..new_default_session(&user.id)
        },
        Session {
            title: "Q3 Strategy Notes".to_string(),
            created_at: now - chrono::Duration::days(65),
            visited_at: now - chrono::Duration::days(65),
            calendar_event_id: Some(events[2].id.clone()), // Q3 Strategy Meeting event
            raw_memo_html: hypr_buffer::opinionated_md_to_html("Focus on growth metrics.").unwrap(),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Archived Note".to_string(),
            created_at: now - chrono::Duration::days(100),
            visited_at: now - chrono::Duration::days(100),
            calendar_event_id: None, // Not linked
            ..new_default_session(&user.id)
        },
        Session {
            title: "Very Old Note".to_string(),
            created_at: now - chrono::Duration::days(150),
            visited_at: now - chrono::Duration::days(150),
            calendar_event_id: None,
            ..new_default_session(&user.id)
        },
        // Include original onboarding sessions if needed, or remove if redundant
        // keyboard_shortcuts_session,
        // editor_basics_session,
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
        words: vec![],
        record_start: None,
        record_end: None,
        pre_meeting_memo_html: None,
    }
}
