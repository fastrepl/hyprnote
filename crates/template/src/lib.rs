use std::sync::OnceLock;

mod filters;
mod testers;

mod error;
pub use error::*;

pub use minijinja;

#[derive(
    Debug, strum::AsRefStr, strum::Display, specta::Type, serde::Serialize, serde::Deserialize,
)]
pub enum Template {
    #[strum(serialize = "enhance.system")]
    #[serde(rename = "enhance.system")]
    EnhanceSystem,
    #[strum(serialize = "enhance.user")]
    #[serde(rename = "enhance.user")]
    EnhanceUser,
    #[strum(serialize = "title.system")]
    #[serde(rename = "title.system")]
    TitleSystem,
    #[strum(serialize = "title.user")]
    #[serde(rename = "title.user")]
    TitleUser,
    #[strum(serialize = "suggest_tags.system")]
    #[serde(rename = "suggest_tags.system")]
    SuggestTagsSystem,
    #[strum(serialize = "suggest_tags.user")]
    #[serde(rename = "suggest_tags.user")]
    SuggestTagsUser,
    #[strum(serialize = "chat.system")]
    #[serde(rename = "chat.system")]
    ChatSystem,
    #[strum(serialize = "chat.user")]
    #[serde(rename = "chat.user")]
    ChatUser,
    #[strum(serialize = "auto_generate_tags.system")]
    #[serde(rename = "auto_generate_tags.system")]
    AutoGenerateTagsSystem,
    #[strum(serialize = "auto_generate_tags.user")]
    #[serde(rename = "auto_generate_tags.user")]
    AutoGenerateTagsUser,
    #[strum(serialize = "postprocess_transcript.system")]
    #[serde(rename = "postprocess_transcript.system")]
    PostprocessTranscriptSystem,
    #[strum(serialize = "postprocess_transcript.user")]
    #[serde(rename = "postprocess_transcript.user")]
    PostprocessTranscriptUser,
}

#[cfg(not(debug_assertions))]
pub const ENHANCE_SYSTEM_TPL: &str = include_str!("../assets/enhance.system.jinja");
#[cfg(not(debug_assertions))]
pub const ENHANCE_USER_TPL: &str = include_str!("../assets/enhance.user.jinja");
#[cfg(not(debug_assertions))]
pub const TITLE_SYSTEM_TPL: &str = include_str!("../assets/title.system.jinja");
#[cfg(not(debug_assertions))]
pub const TITLE_USER_TPL: &str = include_str!("../assets/title.user.jinja");
#[cfg(not(debug_assertions))]
pub const AUTO_GENERATE_TAGS_SYSTEM_TPL: &str =
    include_str!("../assets/auto_generate_tags.system.jinja");
#[cfg(not(debug_assertions))]
pub const AUTO_GENERATE_TAGS_USER_TPL: &str =
    include_str!("../assets/auto_generate_tags.user.jinja");
#[cfg(not(debug_assertions))]
pub const CHAT_SYSTEM_TPL: &str = include_str!("../assets/chat.system.jinja");
#[cfg(not(debug_assertions))]
pub const CHAT_USER_TPL: &str = include_str!("../assets/chat.user.jinja");
#[cfg(not(debug_assertions))]
pub const POSTPROCESS_TRANSCRIPT_SYSTEM_TPL: &str =
    include_str!("../assets/postprocess_transcript.system.jinja");
#[cfg(not(debug_assertions))]
pub const POSTPROCESS_TRANSCRIPT_USER_TPL: &str =
    include_str!("../assets/postprocess_transcript.user.jinja");
#[cfg(not(debug_assertions))]
pub const LANGUAGE_PARTIAL_TPL: &str = include_str!("../assets/_language.partial.jinja");

static GLOBAL_ENV: OnceLock<minijinja::Environment<'static>> = OnceLock::new();

fn init_environment() -> minijinja::Environment<'static> {
    let mut env = minijinja::Environment::new();
    env.set_unknown_method_callback(minijinja_contrib::pycompat::unknown_method_callback);

    #[cfg(debug_assertions)]
    {
        let template_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("assets");
        let base_loader = minijinja::path_loader(&template_dir);

        env.set_loader(
            move |name: &str| -> Result<Option<String>, minijinja::Error> {
                let name_with_ext = format!("{}.jinja", name);
                base_loader(&name_with_ext)
            },
        );
    }

    #[cfg(not(debug_assertions))]
    {
        env.add_template(Template::EnhanceSystem.as_ref(), ENHANCE_SYSTEM_TPL)
            .unwrap();
        env.add_template(Template::EnhanceUser.as_ref(), ENHANCE_USER_TPL)
            .unwrap();
        env.add_template(Template::TitleSystem.as_ref(), TITLE_SYSTEM_TPL)
            .unwrap();
        env.add_template(Template::TitleUser.as_ref(), TITLE_USER_TPL)
            .unwrap();
        env.add_template(Template::ChatSystem.as_ref(), CHAT_SYSTEM_TPL)
            .unwrap();
        env.add_template(Template::ChatUser.as_ref(), CHAT_USER_TPL)
            .unwrap();
        env.add_template(
            Template::AutoGenerateTagsSystem.as_ref(),
            AUTO_GENERATE_TAGS_SYSTEM_TPL,
        )
        .unwrap();
        env.add_template(
            Template::AutoGenerateTagsUser.as_ref(),
            AUTO_GENERATE_TAGS_USER_TPL,
        )
        .unwrap();
        env.add_template(
            Template::PostprocessTranscriptSystem.as_ref(),
            POSTPROCESS_TRANSCRIPT_SYSTEM_TPL,
        )
        .unwrap();
        env.add_template(
            Template::PostprocessTranscriptUser.as_ref(),
            POSTPROCESS_TRANSCRIPT_USER_TPL,
        )
        .unwrap();
        env.add_template("_language.partial", LANGUAGE_PARTIAL_TPL)
            .unwrap();
    }

    {
        env.add_filter("transcript", filters::transcript);
        env.add_filter("url", filters::url);

        env.add_test("todo", testers::todo("dynamic"));
    }

    env
}

pub fn get_environment() -> &'static minijinja::Environment<'static> {
    GLOBAL_ENV.get_or_init(init_environment)
}

pub fn render(
    template: Template,
    ctx: &serde_json::Map<String, serde_json::Value>,
) -> Result<String, crate::Error> {
    #[cfg(debug_assertions)]
    {
        let env = init_environment();
        let tpl = env.get_template(template.as_ref())?;
        tpl.render(ctx).map_err(Into::into).map(|s| {
            println!("--\n{}\n--", s);
            s
        })
    }

    #[cfg(not(debug_assertions))]
    {
        let env = get_environment();
        let tpl = env.get_template(template.as_ref())?;
        tpl.render(ctx).map_err(Into::into)
    }
}

pub fn render_custom(
    template_content: &str,
    ctx: &serde_json::Map<String, serde_json::Value>,
) -> Result<String, crate::Error> {
    let env = get_environment();
    let tpl = env.template_from_str(template_content)?;
    tpl.render(ctx).map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(debug_assertions)]
    #[test]
    fn test_loader_in_debug_mode() {
        let env = get_environment();
        let template = env.get_template("enhance.system");
        assert!(
            template.is_ok(),
            "In debug mode, loader should find template by appending .jinja"
        );
    }
}
