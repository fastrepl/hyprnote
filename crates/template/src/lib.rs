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
}

impl From<PredefinedTemplate> for Template {
    fn from(value: PredefinedTemplate) -> Self {
        match value {
            PredefinedTemplate::EnhanceSystem => {
                Template::Static(PredefinedTemplate::EnhanceSystem)
            }
            PredefinedTemplate::EnhanceUser => Template::Static(PredefinedTemplate::EnhanceUser),
        }
    }
}

pub const ENHANCE_SYSTEM_TPL: &str = include_str!("../assets/enhance.system.jinja");
pub const ENHANCE_USER_TPL: &str = include_str!("../assets/enhance.user.jinja");

pub fn init(env: &mut minijinja::Environment) {
    env.set_unknown_method_callback(minijinja_contrib::pycompat::unknown_method_callback);

    env.add_template(
        PredefinedTemplate::EnhanceSystem.as_ref(),
        ENHANCE_SYSTEM_TPL,
    )
    .unwrap();
    env.add_template(PredefinedTemplate::EnhanceUser.as_ref(), ENHANCE_USER_TPL)
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

    tpl.render(ctx).map_err(Into::into)
}
