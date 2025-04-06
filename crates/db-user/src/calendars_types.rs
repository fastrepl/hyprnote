use crate::user_common_derives;

user_common_derives! {
    pub struct Calendar {
        pub id: String,
        pub tracking_id: String,
        pub user_id: String,
        pub platform: Platform,
        pub name: String,
        pub selected: bool
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

impl From<hypr_calendar_interface::Platform> for Platform {
    fn from(platform: hypr_calendar_interface::Platform) -> Self {
        match platform {
            hypr_calendar_interface::Platform::Apple => Platform::Apple,
            hypr_calendar_interface::Platform::Google => Platform::Google,
        }
    }
}

impl From<Platform> for hypr_calendar_interface::Platform {
    fn from(platform: Platform) -> Self {
        match platform {
            Platform::Apple => hypr_calendar_interface::Platform::Apple,
            Platform::Google => hypr_calendar_interface::Platform::Google,
        }
    }
}
