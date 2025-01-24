pub mod enhance;
mod renderer;

use tera::Context;
use tera::Tera;

lazy_static::lazy_static! {
    pub static ref TEMPLATES: Tera = {
        let base = env!("CARGO_MANIFEST_DIR");
        let mut tera = match Tera::new(format!("{}/templates/*.tera", base).as_str()) {
            Ok(t) => t,
            Err(e) => panic!("{}", e),
        };

        tera.autoescape_on(vec![]);
        tera.register_filter("render_language", renderer::language());
        tera.register_filter("render_transcript", renderer::transcript());
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
    let rendered = TEMPLATES
        .render(&tpl.to_string(), ctx)
        .map(|s| s.trim().to_string())
        .map_err(Error::Tera);

    #[cfg(debug_assertions)]
    if std::env::var("DEBUG").unwrap_or_default() == "1" {
        let txt = rendered.as_ref().unwrap();
        bat::PrettyPrinter::new()
            .language("markdown")
            .grid(true)
            .input_from_bytes(txt.as_bytes())
            .print()
            .unwrap();
    }

    rendered
}
