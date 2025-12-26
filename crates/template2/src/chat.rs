use crate::common_derives;

common_derives! {
    pub struct ChatContext {
        pub title: Option<String>,
        pub date: Option<String>,
        pub raw_content: Option<String>,
        pub enhanced_content: Option<String>,
        pub transcript: Option<String>,
    }
}

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "chat.system.jinja")]
    pub struct ChatSystem {
        pub language: Option<String>,
        pub context: Option<ChatContext>,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use askama::Template;

    #[test]
    fn test_chat_system_no_context() {
        let template = ChatSystem {
            language: None,
            context: None,
        };
        let result = template.render().unwrap();
        assert!(result.contains("meeting assistant"));
    }

    #[test]
    fn test_chat_system_with_context() {
        let template = ChatSystem {
            language: None,
            context: Some(ChatContext {
                title: Some("Weekly Standup".to_string()),
                date: Some("2025-01-15".to_string()),
                raw_content: None,
                enhanced_content: Some("Meeting summary here".to_string()),
                transcript: Some("Speaker 1: Hello\nSpeaker 2: Hi".to_string()),
            }),
        };
        let result = template.render().unwrap();
        assert!(result.contains("Weekly Standup"));
        assert!(result.contains("Meeting summary here"));
    }
}
