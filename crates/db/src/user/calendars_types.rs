use crate::user_common_derives;

user_common_derives! {
    pub struct Calendar {
        pub id: String,
        pub tracking_id: String,
        pub platform: Platform,
        pub name: String,
        pub selected: bool
    }
}

impl From<hypr_calendar::Calendar> for Calendar {
    fn from(calendar: hypr_calendar::Calendar) -> Self {
        Calendar {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: calendar.id,
            platform: calendar.platform.into(),
            name: calendar.name,
            selected: false,
        }
    }
}

user_common_derives! {
    #[derive(strum::Display)]
    pub enum Platform {
        #[strum(serialize = "Apple")]
        Apple,
        #[strum(serialize = "Google")]
        Google,
    }
}

impl From<hypr_calendar::Platform> for Platform {
    fn from(platform: hypr_calendar::Platform) -> Self {
        match platform {
            hypr_calendar::Platform::Apple => Platform::Apple,
            hypr_calendar::Platform::Google => Platform::Google,
        }
    }
}
