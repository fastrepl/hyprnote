use crate::user_common_derives;

user_common_derives! {
    pub struct Human {
        pub id: String,
        pub organization_id: Option<String>,
        pub role: Option<String>,
        pub is_user: bool,
        pub name: String,
        pub email: Option<String>,
        pub color_hex: String,
    }
}

impl From<hypr_calendar::Participant> for Human {
    fn from(participant: hypr_calendar::Participant) -> Self {
        Human {
            id: uuid::Uuid::new_v4().to_string(),
            organization_id: None,
            role: None,
            is_user: false,
            name: participant.name,
            email: participant.email,
            color_hex: random_color::RandomColor::new().to_hex(),
        }
    }
}
