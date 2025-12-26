use crate::common_derives;

common_derives! {
    pub struct Session {
        pub is_event: bool,
        pub title: Option<String>,
        pub started_at: Option<String>,
        pub ended_at: Option<String>,
        pub location: Option<String>,
    }
}

common_derives! {
    pub struct Participant {
        pub name: String,
        pub job_title: Option<String>,
    }
}

common_derives! {
    pub struct TemplateSection {
        pub title: String,
        pub description: Option<String>,
    }
}

common_derives! {
    pub struct EnhanceTemplate {
        pub title: String,
        pub description: Option<String>,
        pub sections: Vec<TemplateSection>,
    }
}

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "enhance.system.jinja")]
    pub struct EnhanceSystem {
        pub language: Option<String>,
        pub has_template: bool,
    }
}

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "enhance.user.jinja")]
    pub struct EnhanceUser {
        pub session: Option<Session>,
        pub participants: Vec<Participant>,
        pub template: Option<EnhanceTemplate>,
        pub transcript: String,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use askama::Template;

    #[test]
    fn test_enhance_system_with_template() {
        let template = EnhanceSystem {
            language: None,
            has_template: true,
        };
        let result = template.render().unwrap();
        assert!(result.contains("User provides a template"));
    }

    #[test]
    fn test_enhance_system_without_template() {
        let template = EnhanceSystem {
            language: None,
            has_template: false,
        };
        let result = template.render().unwrap();
        assert!(result.contains("User provides content"));
    }

    #[test]
    fn test_enhance_user() {
        let session = Session {
            is_event: true,
            title: Some("Weekly Standup".to_string()),
            started_at: Some("10:00".to_string()),
            ended_at: Some("10:30".to_string()),
            location: Some("Room A".to_string()),
        };
        let participants = vec![
            Participant {
                name: "Alice".to_string(),
                job_title: Some("Engineer".to_string()),
            },
            Participant {
                name: "Bob".to_string(),
                job_title: None,
            },
        ];
        let template = EnhanceUser {
            session: Some(session),
            participants,
            template: None,
            transcript: "Alice: Hello everyone.\nBob: Hi!".to_string(),
        };
        let result = template.render().unwrap();
        assert!(result.contains("Weekly Standup"));
        assert!(result.contains("Alice"));
        assert!(result.contains("Bob"));
    }
}
