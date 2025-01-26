mod filters;
mod functions;
mod testers;

pub mod enhance;

use tera::Context;
use tera::Tera;

use std::f64::INFINITY;
use std::time::Duration;

lazy_static::lazy_static! {
    pub static ref TEMPLATES: Tera = {
        let base = env!("CARGO_MANIFEST_DIR");
        let mut tera = match Tera::new(format!("{}/templates/*.jinja", base).as_str()) {
            Ok(t) => t,
            Err(e) => panic!("{}", e),
        };

        tera.register_filter("language", filters::language());

        tera.register_tester("korean", testers::language(codes_iso_639::part_1::LanguageCode::Kr));
        tera.register_tester("japanese", testers::language(codes_iso_639::part_1::LanguageCode::Ja));
        tera.register_tester("english", testers::language(codes_iso_639::part_1::LanguageCode::En));

        tera.register_tester("short_meeting", testers::duration(Duration::from_secs(0), Duration::from_secs(60 * 10)));
        tera.register_tester("long_meeting", testers::duration(Duration::from_secs(60 * 10), Duration::from_secs(INFINITY as u64)));

        tera.register_function("render_conversation", functions::render_conversation());
        tera.register_function("render_event_and_participants", functions::render_event_and_participants());

        tera.autoescape_on(vec!["preview.jinja"]);
        tera
    };
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Tera error: {0}")]
    Tera(#[from] tera::Error),
}

pub enum Template {
    EnhanceSystem,
    EnhanceUser,
    Preview,
}

impl std::fmt::Display for Template {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Template::EnhanceSystem => write!(f, "enhance.system.jinja"),
            Template::EnhanceUser => write!(f, "enhance.user.jinja"),
            Template::Preview => write!(f, "preview.jinja"),
        }
    }
}

fn render(tpl: Template, ctx: &tera::Context) -> Result<String, Error> {
    TEMPLATES
        .render(&tpl.to_string(), ctx)
        .map(|s| s.trim().to_string())
        .map_err(Error::Tera)
}
