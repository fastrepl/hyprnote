use crate::user_common_derives;

user_common_derives! {
    pub struct Human {
        pub id: String,
        pub organization_id: Option<String>,
        pub is_user: bool,
        pub name: Option<String>,
        pub email: Option<String>,
        pub job_title: Option<String>,
        pub linkedin_url: Option<String>,
    }
}

impl Default for Human {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            organization_id: None,
            is_user: false,
            name: None,
            email: None,
            job_title: None,
            linkedin_url: None,
        }
    }
}

impl From<hypr_calendar::Participant> for Human {
    fn from(participant: hypr_calendar::Participant) -> Self {
        Human {
            id: uuid::Uuid::new_v4().to_string(),
            organization_id: None,
            is_user: false,
            name: Some(participant.name),
            email: participant.email,
            job_title: None,
            linkedin_url: None,
        }
    }
}
