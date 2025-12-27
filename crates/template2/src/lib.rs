pub mod chat;
pub mod enhance;
pub mod filters;
pub mod title;
pub mod types;

pub use chat::*;
pub use enhance::*;
pub use title::*;
pub use types::*;

#[macro_export]
macro_rules! common_derives {
    ($item:item) => {
        #[derive(Clone, serde::Deserialize, serde::Serialize, specta::Type)]
        #[serde(rename_all = "camelCase")]
        $item
    };
}

common_derives! {
    pub enum Template {
        EnhanceSystem(EnhanceSystem),
        EnhanceUser(EnhanceUser),
        TitleSystem(TitleSystem),
        TitleUser(TitleUser),
        ChatSystem(ChatSystem),
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    AskamaError(#[from] askama::Error),
}

pub fn render(t: Template) -> Result<String, Error> {
    let value = match t {
        Template::EnhanceSystem(t) => askama::Template::render(&t),
        Template::EnhanceUser(t) => askama::Template::render(&t),
        Template::TitleSystem(t) => askama::Template::render(&t),
        Template::TitleUser(t) => askama::Template::render(&t),
        Template::ChatSystem(t) => askama::Template::render(&t),
    }?;

    Ok(value)
}
