use codes_iso_639::part_1::LanguageCode;
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
    #[strum(serialize = "create_title.system")]
    #[serde(rename = "create_title.system")]
    CreateTitleSystem,
    #[strum(serialize = "create_title.user")]
    #[serde(rename = "create_title.user")]
    CreateTitleUser,
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

pub const ENHANCE_SYSTEM_TPL: &str = include_str!("../assets/enhance.system.jinja");
pub const ENHANCE_USER_TPL: &str = include_str!("../assets/enhance.user.jinja");
pub const CREATE_TITLE_SYSTEM_TPL: &str = include_str!("../assets/create_title.system.jinja");
pub const CREATE_TITLE_USER_TPL: &str = include_str!("../assets/create_title.user.jinja");
pub const SUGGEST_TAGS_SYSTEM_TPL: &str = include_str!("../assets/suggest_tags.system.jinja");
pub const SUGGEST_TAGS_USER_TPL: &str = include_str!("../assets/suggest_tags.user.jinja");
pub const AUTO_GENERATE_TAGS_SYSTEM_TPL: &str =
    include_str!("../assets/auto_generate_tags.system.jinja");
pub const AUTO_GENERATE_TAGS_USER_TPL: &str =
    include_str!("../assets/auto_generate_tags.user.jinja");
pub const CHAT_SYSTEM_TPL: &str = include_str!("../assets/chat.system.jinja");
pub const CHAT_USER_TPL: &str = include_str!("../assets/chat.user.jinja");
pub const POSTPROCESS_TRANSCRIPT_SYSTEM_TPL: &str =
    include_str!("../assets/postprocess_transcript.system.jinja");
pub const POSTPROCESS_TRANSCRIPT_USER_TPL: &str =
    include_str!("../assets/postprocess_transcript.user.jinja");

static GLOBAL_ENV: OnceLock<minijinja::Environment<'static>> = OnceLock::new();

fn init_environment() -> minijinja::Environment<'static> {
    let mut env = minijinja::Environment::new();
    env.set_unknown_method_callback(minijinja_contrib::pycompat::unknown_method_callback);

    {
        env.add_template(Template::EnhanceSystem.as_ref(), ENHANCE_SYSTEM_TPL)
            .unwrap();
        env.add_template(Template::EnhanceUser.as_ref(), ENHANCE_USER_TPL)
            .unwrap();
        env.add_template(
            Template::CreateTitleSystem.as_ref(),
            CREATE_TITLE_SYSTEM_TPL,
        )
        .unwrap();
        env.add_template(Template::CreateTitleUser.as_ref(), CREATE_TITLE_USER_TPL)
            .unwrap();
        env.add_template(
            Template::SuggestTagsSystem.as_ref(),
            SUGGEST_TAGS_SYSTEM_TPL,
        )
        .unwrap();
        env.add_template(Template::SuggestTagsUser.as_ref(), SUGGEST_TAGS_USER_TPL)
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
    }

    {
        env.add_filter("timeline", filters::timeline);
        env.add_filter("language", filters::language);
        [LanguageCode::En, LanguageCode::Ko]
            .iter()
            .for_each(|lang| {
                env.add_test(
                    lang.language_name().to_lowercase(),
                    testers::language(*lang),
                );
            });
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
    let env = get_environment();
    let tpl = env.get_template(template.as_ref())?;

    tpl.render(ctx).map_err(Into::into).map(|s| {
        #[cfg(debug_assertions)]
        println!("--\n{}\n--", s);
        s
    })
}
