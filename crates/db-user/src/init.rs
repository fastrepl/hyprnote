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

    let fastrepl_sung = Human {
        id: uuid::Uuid::new_v4().to_string(),
        full_name: Some("Sung Cho".to_string()),
        email: Some("sung@fastrepl.com".to_string()),
        organization_id: Some(fastrepl_org.id.clone()),
        is_user: false,
        job_title: None,
        linkedin_username: None,
    };

    let fastrepl_duck = Human {
        id: uuid::Uuid::new_v4().to_string(),
        full_name: Some("Duck Lee".to_string()),
        email: Some("duck@fastrepl.com".to_string()),
        organization_id: Some(fastrepl_org.id.clone()),
        is_user: false,
        job_title: None,
        linkedin_username: None,
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
        start_date: chrono::Utc::now() + chrono::Duration::minutes(3),
        end_date: chrono::Utc::now() + chrono::Duration::minutes(10),
        google_event_url: None,
        participants: None,
        is_recurring: false,
    };

    let onboarding_session_id = db.onboarding_session_id();
    let thank_you_session_id = db.thank_you_session_id();

    let thank_you_session = Session {
        id: thank_you_session_id,
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

    for member in [
        &fastrepl_john,
        &fastrepl_yujong,
        &fastrepl_sung,
        &fastrepl_duck,
    ] {
        let _ = db.upsert_human(member.clone()).await?;
    }

    for participant in [
        &fastrepl_john,
        &fastrepl_yujong,
        &fastrepl_sung,
        &fastrepl_duck,
    ] {
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
        // === FUTURE EVENTS (for "Upcoming" section testing) ===
        // Event 1: In 15 minutes - with session (will be created below)
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
            start_date: now + chrono::Duration::minutes(15),
            end_date: now + chrono::Duration::minutes(45),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 2: Tomorrow - with session (top 3 test)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Team Review Meeting".to_string(),
            note: "Weekly team review and planning".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(1),
            end_date: now + chrono::Duration::days(1) + chrono::Duration::hours(1),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 3: In 2 days - without session (top 3 test)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Client Presentation".to_string(),
            note: "Presenting Q3 results to client".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(2),
            end_date: now + chrono::Duration::days(2) + chrono::Duration::hours(2),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 4: In 3 days - with session (top 3 test)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Product Roadmap Discussion".to_string(),
            note: "Planning next quarter's product roadmap".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(3),
            end_date: now + chrono::Duration::days(3) + chrono::Duration::hours(1),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 5: In 7 days - with session (should NOT be in top 3, tests append logic when active)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Sprint Planning".to_string(),
            note: "Planning the next 2-week sprint".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(7),
            end_date: now + chrono::Duration::days(7) + chrono::Duration::hours(2),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 6: In 14 days - without session (should NOT be in top 3)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "All Hands Meeting".to_string(),
            note: "Monthly all hands company meeting".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(14),
            end_date: now + chrono::Duration::days(14) + chrono::Duration::hours(1),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 7: In 4 hours - Video Call with session
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Design Review - Mobile App".to_string(),
            note: indoc::indoc! {r#"|
                Design review session for the new mobile app interface.
                
                Join Zoom Meeting
                https://zoom.us/j/123456789?pwd=abc123
                Meeting ID: 123 456 789
                Passcode: design123
                
                Attendees:
                - Sarah Johnson (Design Lead)
                - Mike Chen (Product Manager)
                - Alex Rivera (Developer)
            "#}.to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::hours(4),
            end_date: now + chrono::Duration::hours(5),
            google_event_url: Some("https://zoom.us/j/123456789?pwd=abc123".to_string()),
            participants: None,
            is_recurring: false,
        },
        // Event 8: In 6 hours - Quick sync without session
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Quick Sync - Project Alpha".to_string(),
            note: "Brief sync on Project Alpha progress and blockers".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::hours(6),
            end_date: now + chrono::Duration::hours(6) + chrono::Duration::minutes(15),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 9: Later today - Team retro with session
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Sprint Retrospective".to_string(),
            note: indoc::indoc! {r#"|
                Sprint 23 Retrospective Meeting
                
                Agenda:
                - What went well?
                - What could be improved?
                - Action items for next sprint
                
                Microsoft Teams Meeting
                https://teams.microsoft.com/l/meetup-join/meeting123
            "#}.to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::hours(8),
            end_date: now + chrono::Duration::hours(9),
            google_event_url: Some("https://teams.microsoft.com/l/meetup-join/meeting123".to_string()),
            participants: None,
            is_recurring: false,
        },
        // Event 10: In 5 days - Client demo with session  
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Client Demo - Acme Corp".to_string(),
            note: indoc::indoc! {r#"|
                Product demonstration for Acme Corp
                
                Demo Flow:
                1. Dashboard overview
                2. New features showcase
                3. Q&A session
                4. Next steps discussion
                
                Google Meet
                https://meet.google.com/abc-defg-hij
                Phone: +1 555-0123
            "#}.to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(5),
            end_date: now + chrono::Duration::days(5) + chrono::Duration::hours(1) + chrono::Duration::minutes(30),
            google_event_url: Some("https://meet.google.com/abc-defg-hij".to_string()),
            participants: None,
            is_recurring: false,
        },
        // Event 11: In 6 days - Workshop without session
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "UX Workshop - User Journey Mapping".to_string(),
            note: "Interactive workshop on mapping user journeys and identifying pain points in our product".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(6),
            end_date: now + chrono::Duration::days(6) + chrono::Duration::hours(3),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 12: In 8 days - Interview with session
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Technical Interview - Senior Developer".to_string(),
            note: indoc::indoc! {r#"|
                Technical interview for Senior Software Developer position
                
                Candidate: Jordan Martinez
                Role: Senior Full-Stack Developer
                
                Interview Plan:
                - System design discussion (30 min)
                - Coding challenge (45 min)
                - Behavioral questions (15 min)
                
                Zoom Meeting
                https://zoom.us/j/987654321?pwd=interview123
            "#}.to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(8),
            end_date: now + chrono::Duration::days(8) + chrono::Duration::hours(1) + chrono::Duration::minutes(30),
            google_event_url: Some("https://zoom.us/j/987654321?pwd=interview123".to_string()),
            participants: None,
            is_recurring: false,
        },
        // Event 13: In 10 days - Board meeting without session
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Board Meeting - Q3 Review".to_string(),
            note: "Quarterly board meeting to review Q3 performance and discuss Q4 strategy".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(10),
            end_date: now + chrono::Duration::days(10) + chrono::Duration::hours(2),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 14: In 12 days - Training session with session
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Security Training - OWASP Best Practices".to_string(),
            note: indoc::indoc! {r#"|
                Company-wide security training session
                
                Topics:
                - OWASP Top 10 vulnerabilities
                - Secure coding practices
                - Incident response procedures
                - Security tools overview
                
                WebEx Meeting
                https://company.webex.com/meet/security.training
                Meeting Number: 2468013579
            "#}.to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(12),
            end_date: now + chrono::Duration::days(12) + chrono::Duration::hours(2),
            google_event_url: Some("https://company.webex.com/meet/security.training".to_string()),
            participants: None,
            is_recurring: false,
        },
        // Event 15: In 3 weeks - Conference without session
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Tech Conference 2024".to_string(),
            note: "Annual technology conference - attending sessions on AI, cloud architecture, and emerging technologies".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now + chrono::Duration::days(21),
            end_date: now + chrono::Duration::days(23),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // === PAST EVENTS (for NotesList section testing) ===
        // Event 16: Yesterday - with session (should appear in notes)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Follow-up Discussion".to_string(),
            note: "Follow-up on yesterday's decisions".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now - chrono::Duration::days(1),
            end_date: now - chrono::Duration::days(1) + chrono::Duration::minutes(30),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 17: Last week - with session (should appear in notes)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Project Kickoff".to_string(),
            note: "Initial meeting for Project Phoenix".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now - chrono::Duration::days(7),
            end_date: now - chrono::Duration::days(7) + chrono::Duration::hours(1),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 18: 10 days ago - with session (should appear in notes)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Q3 Strategy Meeting".to_string(),
            note: "Quarterly planning session".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now - chrono::Duration::days(10),
            end_date: now - chrono::Duration::days(10) + chrono::Duration::hours(2),
            google_event_url: None,
            participants: None,
            is_recurring: false,
        },
        // Event 19: 2 weeks ago - without session (should not appear anywhere)
        Event {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id.clone(),
            tracking_id: uuid::Uuid::new_v4().to_string(),
            name: "Random Thoughts".to_string(),
            note: "Random thoughts session".to_string(),
            calendar_id: Some(calendars[0].id.clone()),
            start_date: now - chrono::Duration::days(14),
            end_date: now - chrono::Duration::days(14) + chrono::Duration::hours(1),
            google_event_url: None,
            participants: None,
            is_recurring: false,
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

    // Get IDs for linking sessions to events
    let daily_standup_event_id = events[0].id.clone(); // Future: Daily Standup (in 15 min)
    let team_review_event_id = events[1].id.clone(); // Future: Team Review (tomorrow)
    let product_roadmap_event_id = events[3].id.clone(); // Future: Product Roadmap (in 3 days)
    let sprint_planning_event_id = events[4].id.clone(); // Future: Sprint Planning (in 7 days)
    let followup_event_id = events[6].id.clone(); // Past: Follow-up Discussion (yesterday)
    let kickoff_event_id = events[7].id.clone(); // Past: Project Kickoff (last week)
    let strategy_event_id = events[8].id.clone(); // Past: Q3 Strategy (10 days ago)

    let sessions = vec![
        // === SESSIONS FOR FUTURE EVENTS (should appear in "Upcoming" section) ===
        // Session for Daily Standup (in 15 minutes)
        Session {
            title: "Daily Standup Prep".to_string(),
            created_at: now - chrono::Duration::minutes(30),
            visited_at: now - chrono::Duration::minutes(30),
            calendar_event_id: Some(daily_standup_event_id),
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Agenda\n- Sprint progress update\n- Blockers discussion\n### Notes\n- Remember to mention API delay",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // Session for Team Review (tomorrow)
        Session {
            title: "Team Review Planning".to_string(),
            created_at: now - chrono::Duration::hours(2),
            visited_at: now - chrono::Duration::hours(2),
            calendar_event_id: Some(team_review_event_id),
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Topics to Cover\n- Q3 performance review\n- Team feedback\n- Next quarter planning",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // Session for Product Roadmap (in 3 days)
        Session {
            title: "Product Roadmap Discussion Notes".to_string(),
            created_at: now - chrono::Duration::hours(6),
            visited_at: now - chrono::Duration::hours(6),
            calendar_event_id: Some(product_roadmap_event_id),
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Key Features\n- User authentication\n- Dashboard redesign\n### Timeline\n- Q1 2024 launch target",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // Session for Sprint Planning (in 7 days) - This tests the "append active session" logic
        Session {
            title: "Sprint Planning Preparation".to_string(),
            created_at: now - chrono::Duration::hours(12),
            visited_at: now - chrono::Duration::hours(12),
            calendar_event_id: Some(sprint_planning_event_id),
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Sprint Goals\n- Complete user story X\n- Fix critical bugs\n### Resources\n- 2 developers, 1 designer",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // === SESSIONS FOR PAST EVENTS (should appear in regular notes section) ===
        // Session for Follow-up Discussion (yesterday)
        Session {
            title: "Follow-up Discussion Notes".to_string(),
            created_at: now - chrono::Duration::days(1),
            visited_at: now - chrono::Duration::days(1),
            calendar_event_id: Some(followup_event_id),
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Decisions Made\n- Proceed with Plan A\n- Allocate additional resources\n### Next Steps\n- Schedule follow-up in 2 weeks",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // Session for Project Kickoff (last week)
        Session {
            title: "Project Phoenix Kickoff".to_string(),
            created_at: now - chrono::Duration::days(7),
            visited_at: now - chrono::Duration::days(7),
            calendar_event_id: Some(kickoff_event_id),
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Project Goals\n- Launch by Q4\n- Target 10k users\n### Risks\n- Resource constraints\n- Technical challenges",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // Session for Q3 Strategy Meeting (10 days ago)
        Session {
            title: "Q3 Strategy Session".to_string(),
            created_at: now - chrono::Duration::days(10),
            visited_at: now - chrono::Duration::days(10),
            calendar_event_id: Some(strategy_event_id),
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Key Metrics\n- Revenue growth: 25%\n- User acquisition: 15%\n### Focus Areas\n- Product optimization\n- Market expansion",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // === STANDALONE SESSIONS (not linked to events, should appear in notes) ===
        // Recent standalone note
        Session {
            title: "Quick Ideas".to_string(),
            created_at: now - chrono::Duration::minutes(5),
            visited_at: now - chrono::Duration::minutes(5),
            calendar_event_id: None,
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Random Thoughts\n- New feature idea: dark mode\n- Bug: login form validation\n- Todo: Update documentation",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        // Yesterday standalone note
        Session {
            title: "Personal Notes".to_string(),
            created_at: now - chrono::Duration::days(1) + chrono::Duration::hours(2),
            visited_at: now - chrono::Duration::days(1) + chrono::Duration::hours(2),
            calendar_event_id: None,
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Personal Reminders\n- Call dentist\n- Review insurance policy\n- Book vacation",
            )
            .unwrap(),
            enhanced_memo_html: Some(
                hypr_buffer::opinionated_md_to_html(
                    "### Personal Reminders\n- Call dentist ✓\n- Review insurance policy\n- Book vacation",
                )
                .unwrap(),
            ),
            words: {
                let words = serde_json::from_str::<Vec<owhisper_interface::Word2>>(
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
        // Older standalone sessions
        Session {
            title: "Week Review".to_string(),
            created_at: now - chrono::Duration::days(6),
            visited_at: now - chrono::Duration::days(6),
            calendar_event_id: None,
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Week Highlights\n- Completed 3 major tasks\n- Fixed 5 bugs\n### Next Week\n- Focus on new features",
            )
            .unwrap(),
            words: serde_json::from_str::<Vec<owhisper_interface::Word2>>(
                &hypr_data::english_6::WORDS_JSON,
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Old Ideas".to_string(),
            created_at: now - chrono::Duration::days(40),
            visited_at: now - chrono::Duration::days(40),
            calendar_event_id: None,
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Brainstorming\n- App redesign concepts\n- User experience improvements",
            )
            .unwrap(),
            ..new_default_session(&user.id)
        },
        Session {
            title: "Archived Notes".to_string(),
            created_at: now - chrono::Duration::days(100),
            visited_at: now - chrono::Duration::days(100),
            calendar_event_id: None,
            raw_memo_html: hypr_buffer::opinionated_md_to_html(
                "### Historical Notes\n- Old project ideas\n- Archive for reference",
            )
            .unwrap(),
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
            session_id: sessions[0].id.clone(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_thank_you() {
        let html = hypr_buffer::opinionated_md_to_html(THANK_YOU_MD).unwrap();

        assert!(html.contains("We appreciate your patience"));
        assert!(html.contains("join our Discord"));

        assert!(html.contains(r#"class="mention""#));
        assert!(html.contains(r#"data-mention="true""#));
        assert!(html.contains(r#"data-id="john-jeong""#));
        assert!(html.contains(r#"data-type="user""#));
        assert!(html.contains(r#"data-label="John Jeong""#));
        assert!(html.contains(r#"@John Jeong"#));
        assert!(html.contains(r#"data-id="yujong-lee""#));
        assert!(html.contains(r#"@Yujong Lee"#));

        assert!(html.contains(r#"window.__HYPR_NAVIGATE__('/app/user/john-jeong')"#));
        assert!(html.contains(r#"window.__HYPR_NAVIGATE__('/app/user/yujong-lee')"#));
    }
}
