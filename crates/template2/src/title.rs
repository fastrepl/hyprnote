use crate::common_derives;

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "title.system.jinja")]
    pub struct TitleSystem {
        pub language: Option<String>,
    }
}

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "title.user.jinja")]
    pub struct TitleUser {
        pub enhanced_note: String,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use askama::Template;

    #[test]
    fn test_title_system() {
        let template = TitleSystem { language: None };
        let result = template.render().unwrap();
        assert!(result.contains("professional assistant"));
    }

    #[test]
    fn test_title_system_korean() {
        let template = TitleSystem {
            language: Some("ko".to_string()),
        };
        let result = template.render().unwrap();
        assert!(result.contains("ko"));
    }

    #[test]
    fn test_title_user() {
        let template = TitleUser {
            enhanced_note: "This is a meeting about project updates.".to_string(),
        };
        let result = template.render().unwrap();
        assert!(result.contains("This is a meeting about project updates."));
    }
}
