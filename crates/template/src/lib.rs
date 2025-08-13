use codes_iso_639::part_1::LanguageCode;

mod filters;
mod testers;

mod error;
pub use error::*;

pub use minijinja;

pub enum Template {
    Static(PredefinedTemplate),
    Dynamic(String),
}

impl From<String> for Template {
    fn from(value: String) -> Self {
        Template::Dynamic(value)
    }
}

impl From<Template> for String {
    fn from(value: Template) -> Self {
        match value {
            Template::Static(t) => t.to_string(),
            Template::Dynamic(t) => t,
        }
    }
}

#[derive(Debug, strum::AsRefStr, strum::Display)]
pub enum PredefinedTemplate {
    #[strum(serialize = "enhance.system")]
    EnhanceSystem,
    #[strum(serialize = "enhance.user")]
    EnhanceUser,
    #[strum(serialize = "create_title.system")]
    CreateTitleSystem,
    #[strum(serialize = "create_title.user")]
    CreateTitleUser,
    #[strum(serialize = "suggest_tags.system")]
    SuggestTagsSystem,
    #[strum(serialize = "suggest_tags.user")]
    SuggestTagsUser,
    #[strum(serialize = "ai_chat.system")]
    AiChatSystem,
    #[strum(serialize = "auto_generate_tags.system")]
    AutoGenerateTagsSystem,
    #[strum(serialize = "auto_generate_tags.user")]
    AutoGenerateTagsUser,
}

impl From<PredefinedTemplate> for Template {
    fn from(value: PredefinedTemplate) -> Self {
        match value {
            PredefinedTemplate::EnhanceSystem => {
                Template::Static(PredefinedTemplate::EnhanceSystem)
            }
            PredefinedTemplate::EnhanceUser => Template::Static(PredefinedTemplate::EnhanceUser),
            PredefinedTemplate::CreateTitleSystem => {
                Template::Static(PredefinedTemplate::CreateTitleSystem)
            }
            PredefinedTemplate::CreateTitleUser => {
                Template::Static(PredefinedTemplate::CreateTitleUser)
            }
            PredefinedTemplate::SuggestTagsSystem => {
                Template::Static(PredefinedTemplate::SuggestTagsSystem)
            }
            PredefinedTemplate::SuggestTagsUser => {
                Template::Static(PredefinedTemplate::SuggestTagsUser)
            }
            PredefinedTemplate::AiChatSystem => Template::Static(PredefinedTemplate::AiChatSystem),
            PredefinedTemplate::AutoGenerateTagsSystem => {
                Template::Static(PredefinedTemplate::AutoGenerateTagsSystem)
            }
            PredefinedTemplate::AutoGenerateTagsUser => {
                Template::Static(PredefinedTemplate::AutoGenerateTagsUser)
            }
        }
    }
}

pub const ENHANCE_SYSTEM_TPL: &str = include_str!("../assets/enhance.system.jinja");
pub const ENHANCE_USER_TPL: &str = include_str!("../assets/enhance.user.jinja");
pub const CREATE_TITLE_SYSTEM_TPL: &str = include_str!("../assets/create_title.system.jinja");
pub const CREATE_TITLE_USER_TPL: &str = include_str!("../assets/create_title.user.jinja");
pub const SUGGEST_TAGS_SYSTEM_TPL: &str = include_str!("../assets/suggest_tags.system.jinja");
pub const SUGGEST_TAGS_USER_TPL: &str = include_str!("../assets/suggest_tags.user.jinja");
pub const AI_CHAT_SYSTEM_TPL: &str = include_str!("../assets/ai_chat_system.jinja");
pub const AUTO_GENERATE_TAGS_SYSTEM_TPL: &str =
    include_str!("../assets/auto_generate_tags.system.jinja");
pub const AUTO_GENERATE_TAGS_USER_TPL: &str =
    include_str!("../assets/auto_generate_tags.user.jinja");

pub fn init(env: &mut minijinja::Environment) {
    env.set_unknown_method_callback(minijinja_contrib::pycompat::unknown_method_callback);

    env.add_template(
        PredefinedTemplate::EnhanceSystem.as_ref(),
        ENHANCE_SYSTEM_TPL,
    )
    .unwrap();
    env.add_template(PredefinedTemplate::EnhanceUser.as_ref(), ENHANCE_USER_TPL)
        .unwrap();
    env.add_template(
        PredefinedTemplate::CreateTitleSystem.as_ref(),
        CREATE_TITLE_SYSTEM_TPL,
    )
    .unwrap();
    env.add_template(
        PredefinedTemplate::CreateTitleUser.as_ref(),
        CREATE_TITLE_USER_TPL,
    )
    .unwrap();
    env.add_template(
        PredefinedTemplate::SuggestTagsSystem.as_ref(),
        SUGGEST_TAGS_SYSTEM_TPL,
    )
    .unwrap();
    env.add_template(
        PredefinedTemplate::SuggestTagsUser.as_ref(),
        SUGGEST_TAGS_USER_TPL,
    )
    .unwrap();
    env.add_template(
        PredefinedTemplate::AiChatSystem.as_ref(),
        AI_CHAT_SYSTEM_TPL,
    )
    .unwrap();
    env.add_template(
        PredefinedTemplate::AutoGenerateTagsSystem.as_ref(),
        AUTO_GENERATE_TAGS_SYSTEM_TPL,
    )
    .unwrap();
    env.add_template(
        PredefinedTemplate::AutoGenerateTagsUser.as_ref(),
        AUTO_GENERATE_TAGS_USER_TPL,
    )
    .unwrap();
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

pub fn render(
    env: &minijinja::Environment<'static>,
    template: Template,
    ctx: &serde_json::Map<String, serde_json::Value>,
) -> Result<String, crate::Error> {
    let tpl = match template {
        Template::Static(t) => env.get_template(t.as_ref())?,
        Template::Dynamic(t) => env.get_template(&t)?,
    };

    tpl.render(ctx).map_err(Into::into).map(|s| {
        #[cfg(debug_assertions)]
        println!("--\n{}\n--", s);
        s
    })
}
