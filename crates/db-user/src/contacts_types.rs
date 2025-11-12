use crate::user_common_derives;

user_common_derives! {
    pub struct Contact {
        pub id: String,
        pub tracking_id: String,
        pub user_id: String,
        pub platform: crate::Platform,
        pub given_name: String,
        pub family_name: String,
        pub organization: Option<String>,
        pub emails: String,
        pub phone_numbers: String,
        pub note: Option<String>,
    }
}

impl From<hypr_calendar_interface::Contact> for Contact {
    fn from(contact: hypr_calendar_interface::Contact) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: contact.id,
            user_id: String::new(), // Will be set by caller
            platform: contact.platform.into(),
            given_name: contact.given_name,
            family_name: contact.family_name,
            organization: contact.organization,
            emails: serde_json::to_string(&contact.emails).unwrap_or_else(|_| "[]".to_string()),
            phone_numbers: serde_json::to_string(&contact.phone_numbers)
                .unwrap_or_else(|_| "[]".to_string()),
            note: contact.note,
        }
    }
}

impl From<Contact> for hypr_calendar_interface::Contact {
    fn from(contact: Contact) -> Self {
        Self {
            id: contact.tracking_id,
            platform: contact.platform.into(),
            given_name: contact.given_name,
            family_name: contact.family_name,
            organization: contact.organization,
            emails: serde_json::from_str(&contact.emails).unwrap_or_default(),
            phone_numbers: serde_json::from_str(&contact.phone_numbers).unwrap_or_default(),
            note: contact.note,
        }
    }
}
