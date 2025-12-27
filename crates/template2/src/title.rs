use crate::{common_derives, filters};

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "title.system.md.jinja")]
    pub struct TitleSystem {
        pub language: Option<String>,
    }
}

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "title.user.md.jinja")]
    pub struct TitleUser {
        pub enhanced_note: String,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::snapshot;
    use askama::Template;

    snapshot!(
        test_title_system, 
        TitleSystem { language: None }, 
        @r#"
    You are a professional assistant that generates a perfect title for a meeting note.

    IMPORTANT: Generate the title in English language.
    Only output the title as plaintext, nothing else. No characters like *"'([{}]):.
    "#);

    snapshot!(
        test_title_user,
        TitleUser {
            enhanced_note: "".to_string(),
        },
        @r#"
        <note>

        </note>

        Now, give me SUPER CONCISE title for above note. Only about the topic of the meeting.
        "#
    );
}
