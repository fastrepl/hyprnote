use crate::user_common_derives;

user_common_derives! {
    pub struct Calendar {
        pub id: String,
        pub tracking_id: String,
        pub user_id: String,
        pub platform: Platform,
        pub name: String,
        pub selected: bool,
        pub source: Option<String>,
    }
}

user_common_derives! {
    #[derive(strum::Display)]
    pub enum Platform {
        #[strum(serialize = "Apple")]
        Apple,
        #[strum(serialize = "Google")]
        Google,
        #[strum(serialize = "Outlook")]
        Outlook,
    }
}

impl From<hypr_calendar_apple::Platform> for Platform {
    fn from(platform: hypr_calendar_apple::Platform) -> Self {
        match platform {
            hypr_calendar_apple::Platform::Apple => Platform::Apple,
            hypr_calendar_apple::Platform::Google => Platform::Google,
            hypr_calendar_apple::Platform::Outlook => Platform::Outlook,
        }
    }
}

impl From<Platform> for hypr_calendar_apple::Platform {
    fn from(platform: Platform) -> Self {
        match platform {
            Platform::Apple => hypr_calendar_apple::Platform::Apple,
            Platform::Google => hypr_calendar_apple::Platform::Google,
            Platform::Outlook => hypr_calendar_apple::Platform::Outlook,
        }
    }
}
