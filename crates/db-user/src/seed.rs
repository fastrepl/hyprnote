use super::{
    user_common_derives, Calendar, Config, Event, Human, Organization, Session, Tag, UserDatabase,
};

const ONBOARDING_RAW_HTML: &str = include_str!("../assets/onboarding-raw.html");
const THANK_YOU_MD: &str = include_str!("../assets/thank-you.md");

user_common_derives! {
    pub struct SeedData {
        pub organizations: Vec<Organization>,
        pub humans: Vec<Human>,
        pub calendars: Vec<Calendar>,
        pub events: Vec<Event>,
        pub sessions: Vec<Session>,
        pub tags: Vec<Tag>,
        pub config: Option<Config>,
    }
}

user_common_derives! {
    pub struct SeedParams {
        pub user_id: String,
        pub now: chrono::DateTime<chrono::Utc>,
    }
}

impl SeedData {
    pub fn from_json(json: &str, params: SeedParams) -> Result<Self, serde_json::Error> {
        let mut seed: Self = serde_json::from_str(json)?;

        seed.override_session_words();
        seed.override_session_raw_note();
        seed.override_user_id(&params);
        seed.override_timestamp(&params);

        Ok(seed)
    }

    fn override_session_words(&mut self) {
        self.sessions.iter_mut().for_each(|session| {
            if session.id == "550e8400-e29b-41d4-a716-446655442001" {
                session.words = serde_json::from_str(hypr_data::english_3::WORDS_JSON).unwrap();
            }
        });
    }

    fn override_session_raw_note(&mut self) {
        self.sessions.iter_mut().for_each(|session| {
            if session.id == UserDatabase::onboarding_session_id() {
                session.raw_memo_html = ONBOARDING_RAW_HTML.to_string();
            }

            if session.id == UserDatabase::thank_you_session_id() {
                session.raw_memo_html = hypr_buffer::opinionated_md_to_html(THANK_YOU_MD).unwrap();
            }
        });
    }

    fn override_user_id(&mut self, params: &SeedParams) {
        self.humans.iter_mut().for_each(|human| {
            if human.id == "{{ CURRENT_USER_ID }}" {
                human.id = params.user_id.clone();
            }
        });

        self.sessions.iter_mut().for_each(|session| {
            if session.user_id == "{{ CURRENT_USER_ID }}" {
                session.user_id = params.user_id.clone();
            }
        });

        self.events.iter_mut().for_each(|event| {
            if event.user_id == "{{ CURRENT_USER_ID }}" {
                event.user_id = params.user_id.clone();
            }
        });

        self.calendars.iter_mut().for_each(|calendar| {
            if calendar.user_id == "{{ CURRENT_USER_ID }}" {
                calendar.user_id = params.user_id.clone();
            }
        });
    }

    fn override_timestamp(&mut self, params: &SeedParams) {
        let epoch_base = chrono::DateTime::parse_from_rfc3339("1970-01-01T00:00:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc);

        self.sessions.iter_mut().for_each(|session| {
            let offset = session.created_at - epoch_base;
            session.created_at = params.now + offset;

            let offset = session.visited_at - epoch_base;
            session.visited_at = params.now + offset;
        });

        self.events.iter_mut().for_each(|event| {
            let offset = event.start_date - epoch_base;
            event.start_date = params.now + offset;

            let offset = event.end_date - epoch_base;
            event.end_date = params.now + offset;
        });
    }

    pub async fn push(self, db: &UserDatabase) -> Result<(), crate::Error> {
        for org in self.organizations {
            db.upsert_organization(org).await?;
        }
        for human in self.humans {
            db.upsert_human(human).await?;
        }
        for calendar in self.calendars {
            db.upsert_calendar(calendar).await?;
        }
        for event in self.events {
            db.upsert_event(event).await?;
        }
        for session in self.sessions {
            db.upsert_session(session).await?;
        }
        for tag in self.tags {
            db.upsert_tag(tag).await?;
        }
        if let Some(config) = self.config {
            db.set_config(config).await?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_thank_you() {
        let html = hypr_buffer::opinionated_md_to_html(THANK_YOU_MD).unwrap();

        assert!(html.contains("We appreciate your patience"));
    }
}
