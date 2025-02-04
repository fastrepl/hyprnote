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
    pub enum Platform {
        Apple,
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

impl std::fmt::Display for Platform {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Platform::Apple => write!(f, "Apple"),
            Platform::Google => write!(f, "Google"),
        }
    }
}
