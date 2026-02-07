use crate::common_derives;

common_derives! {
    #[derive(strum::AsRefStr, std::hash::Hash)]
    pub enum NangoIntegration {
        #[serde(rename = "google-calendar")]
        #[strum(serialize = "google-calendar")]
        GoogleCalendar,
        #[serde(rename = "outlook-calendar")]
        #[strum(serialize = "outlook-calendar")]
        OutlookCalendar,
    }
}

impl TryFrom<String> for NangoIntegration {
    type Error = crate::Error;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        match value.as_str() {
            "google-calendar" => Ok(NangoIntegration::GoogleCalendar),
            "outlook-calendar" => Ok(NangoIntegration::OutlookCalendar),
            _ => Err(crate::Error::UnknownIntegration),
        }
    }
}

impl From<NangoIntegration> for String {
    fn from(integration: NangoIntegration) -> Self {
        match integration {
            NangoIntegration::GoogleCalendar => "google-calendar".to_string(),
            NangoIntegration::OutlookCalendar => "outlook-calendar".to_string(),
        }
    }
}
