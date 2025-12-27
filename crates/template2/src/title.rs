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
    use askama::Template;

    #[test]
    fn test_title_system() {
        let template = TitleSystem { language: None };
        insta::assert_snapshot!(template.render().unwrap(), @r#"
        You are a professional assistant that generates a perfect title for a meeting note.

        IMPORTANT: Generate the title in English language.
        Only output the title as plaintext, nothing else. No characters like *"'([{}]):.
        "#);
    }

    #[test]
    fn test_title_user() {
        let tpl = TitleUser {
            enhanced_note: "".to_string(),
        };
        insta::assert_snapshot!(tpl.render().unwrap(), @"
        <note>

        </note>

        Now, give me SUPER CONCISE title for above note. Only about the topic of the meeting.
        ");
    }
}
