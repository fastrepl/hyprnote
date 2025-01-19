pub mod enhance;
mod renderer;

use tera::Context;
use tera::Tera;

lazy_static::lazy_static! {
    pub static ref TEMPLATES: Tera = {
        let mut tera = match Tera::new("templates/*.tera") {
            Ok(t) => t,
            Err(e) => panic!("{}", e),
        };

        tera.autoescape_on(vec![]);
        tera.register_filter("render_language", renderer::language());
        tera
    };
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Tera error: {0}")]
    Tera(#[from] tera::Error),
}

pub enum Template {
    Enhance,
}

impl std::fmt::Display for Template {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Template::Enhance => write!(f, "enhance.tera"),
        }
    }
}

fn render(tpl: Template, ctx: &tera::Context) -> Result<String, Error> {
    TEMPLATES
        .render(&tpl.to_string(), ctx)
        .map(|s| s.trim().to_string())
        .map_err(Error::Tera)
}
