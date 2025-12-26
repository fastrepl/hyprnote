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
        pub session: Session,
        pub participants: Vec<Participant>,
        pub template: Option<EnhanceTemplate>,
        pub transcripts: Vec<Transcript>,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Segment, TemplateSection};
    use askama::Template;

    #[test]
    fn test_enhance_system() {
        let tpl = EnhanceSystem { language: None };

        insta::assert_snapshot!(tpl.render().unwrap(), @r#"
        You are an expert at creating structured, comprehensive meeting summaries.

        IMPORTANT: Generate all content in English language.
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
    fn test_enhance_user_1() {
        let tpl = EnhanceUser {
            session: Session {
                title: Some("Meeting".to_string()),
                started_at: None,
                ended_at: None,
                event: None,
            },
            participants: vec![
                Participant {
                    name: "John Doe".to_string(),
                    job_title: Some("CEO".to_string()),
                },
                Participant {
                    name: "Jane Smith".to_string(),
                    job_title: Some("CTO".to_string()),
                },
            ],
            template: Some(EnhanceTemplate {
                title: "Meeting".to_string(),
                description: Some("Meeting description".to_string()),
                sections: vec![
                    TemplateSection {
                        title: "Section 1".to_string(),
                        description: Some("Section 1 description".to_string()),
                    },
                    TemplateSection {
                        title: "Section 2".to_string(),
                        description: Some("Section 2 description".to_string()),
                    },
                ],
            }),
            transcripts: vec![Transcript {
                segments: vec![Segment {
                    text: "Hello".to_string(),
                    speaker: "John Doe".to_string(),
                }],
                started_at: Some(1719859200),
                ended_at: Some(1719862800),
            }],
        };

        insta::assert_snapshot!(tpl.render().unwrap(), @"
        # Context
        Session: Meeting

        Participants:
        - John Doe (CEO)
        - Jane Smith (CTO)

        # Summary Template

        Name: Meeting
        Description: Meeting description

        Sections:
        1. Section 1 - Section 1 description
        2. Section 2 - Section 2 description

        # Transcript

        John Doe: Hello
        ");
    }
}
