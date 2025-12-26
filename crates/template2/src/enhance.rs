use crate::common_derives;
use crate::{EnhanceTemplate, Participant, Session, Transcript};

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "enhance.system.jinja")]
    pub struct EnhanceSystem {
        pub language: Option<String>,
    }
}

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "enhance.user.jinja")]
    pub struct EnhanceUser {
        pub session: Option<Session>,
        pub participants: Vec<Participant>,
        pub template: Option<EnhanceTemplate>,
        pub transcript: Transcript,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use askama::Template;

    #[test]
    fn test_enhance_system() {
        let tpl = EnhanceSystem { language: None };

        insta::assert_snapshot!(tpl.render().unwrap(), @r#"

        You are an expert at creating structured, comprehensive meeting summaries.




        Format requirements:

        - Start with h1 header(#)
        - Use only h1 headers. Do not use h2 or h3. Each header represents a section.
        - Each section should have at least 3 detailed bullet points

        IMPORTANT: Your final output MUST be ONLY the markdown summary itself.
        Do NOT include any explanations, commentary, or meta-discussion.
        Do NOT say things like "Here's the summary" or "I've analyzed".
        "#);
    }

    #[test]
    fn test_enhance_user() {
        let tpl = EnhanceUser {
            session: None,
            participants: vec![],
            template: None,
            transcript: Transcript { segments: vec![] },
        };

        insta::assert_snapshot!(tpl.render().unwrap(), @"



        Workflow:

        1. Analyze the content and decide the sections to use.
        2. Generate a well-formatted markdown summary, following the format requirements.
        ");
    }
}
