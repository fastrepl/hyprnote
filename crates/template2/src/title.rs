use askama::Template;

#[derive(Template, specta::Type)]
#[template(path = "title.system.jinja")]
pub struct TitleSystem<'a> {
    pub language: &'a str,
}

#[derive(Template, specta::Type)]
#[template(path = "title.user.jinja")]
pub struct TitleUser<'a> {
    pub enhanced_note: &'a str,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_title_system() {
        let template = TitleSystem { language: "en" };
        let result = template.render().unwrap();
        assert!(result.contains("professional assistant"));
    }

    #[test]
    fn test_title_system_korean() {
        let template = TitleSystem { language: "ko" };
        let result = template.render().unwrap();
        assert!(result.contains("ko"));
    }

    #[test]
    fn test_title_user() {
        let template = TitleUser {
            enhanced_note: "This is a meeting about project updates.",
        };
        let result = template.render().unwrap();
        assert!(result.contains("This is a meeting about project updates."));
    }
}
