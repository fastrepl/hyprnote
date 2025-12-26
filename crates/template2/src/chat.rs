use crate::Transcript;
use crate::common_derives;

common_derives! {
    pub struct ChatContext {
        pub title: Option<String>,
        pub date: Option<String>,
        pub raw_content: Option<String>,
        pub enhanced_content: Option<String>,
        pub transcript: Option<Transcript>,
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
                transcript: Some(Transcript {
                    segments: vec![
                        crate::types::Segment {
                            text: "Hello".to_string(),
                            speaker: "Speaker 1".to_string(),
                        },
                        crate::types::Segment {
                            text: "Hi".to_string(),
                            speaker: "Speaker 2".to_string(),
                        },
                    ],
                }),
            }),
        };

        let result = template.render().unwrap();

        insta::assert_snapshot!(result, @r#"
        You are a helpful AI meeting assistant in Hyprnote, an intelligent meeting platform that transcribes and analyzes meetings. Your purpose is to help users understand their meeting content better.

        IMPORTANT: Respond in English language.
        You have access to the meeting transcript, AI-generated (enhanced) summary of the meeting, and the original note that the user wrote.

        Always keep your responses concise, professional, and directly relevant to the user's questions.

        YOUR PRIMARY SOURCE OF TRUTH IS THE MEETING TRANSCRIPT. Try to generate responses primarily from the transcript, and then the summary or other information (unless the user asks for something specific).

        Try your best to put markdown notes inside ``` blocks.

        Context: You are helping the user with their meeting notes. Here is the current context:

        Title: Weekly Standup

        Date: 2025-01-15

        Enhanced Meeting Summary:
        Meeting summary here

        Full Meeting Transcript:

        Speaker 1: Hello
        Speaker 2: Hi

        If there is no meeting transcript (blank after the "Full Meeting Transcript:"), it means that the meeting did not happen yet. In this case, you should understand that the user is asking for general information, ideas, or suggestions about preparing for the meeting.

        If there is a meeting transcript and an enhanced meeting summary, it means that the meeting has happened and the user is asking for a new version of the meeting note or the intelligence from the meeting.

        You should treat meeting transcript and enhanced meeting summary as the information with more weight than the original (manually written) note.

        [Response Format Guidelines]
        Your response would be highly likely to be paragraphs with combined information about your thought and whatever note (in markdown format) you generated.

        Your response would mostly be either of the two formats:

        - Suggestion of a new version of the meeting note (in markdown block format, inside ``` blocks) based on user's request. However, be careful not to create an empty markdown block.
        - Information (when it's not rewriting the note, it shouldn't be inside `blocks. Only re-written version of the note should be inside` blocks.)
        "#);
    }
}
