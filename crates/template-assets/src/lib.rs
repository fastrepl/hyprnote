pub const MINIJINJA_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/minijinja");
pub const ASKAMA_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/askama");

#[rustfmt::skip]
pub mod minijinja {
    pub const ENHANCE_SYSTEM: &str = include_str!("../minijinja/enhance.system.jinja");
    pub const ENHANCE_USER: &str = include_str!("../minijinja/enhance.user.jinja");
    pub const TITLE_SYSTEM: &str = include_str!("../minijinja/title.system.jinja");
    pub const TITLE_USER: &str = include_str!("../minijinja/title.user.jinja");
    pub const AUTO_GENERATE_TAGS_SYSTEM: &str = include_str!("../minijinja/auto_generate_tags.system.jinja");
    pub const AUTO_GENERATE_TAGS_USER: &str = include_str!("../minijinja/auto_generate_tags.user.jinja");
    pub const CHAT_SYSTEM: &str = include_str!("../minijinja/chat.system.jinja");
    pub const CHAT_USER: &str = include_str!("../minijinja/chat.user.jinja");
    pub const POSTPROCESS_TRANSCRIPT_SYSTEM: &str = include_str!("../minijinja/postprocess_transcript.system.jinja");
    pub const POSTPROCESS_TRANSCRIPT_USER: &str = include_str!("../minijinja/postprocess_transcript.user.jinja");
    pub const HIGHLIGHT_SYSTEM: &str = include_str!("../minijinja/highlight.system.jinja");
    pub const HIGHLIGHT_USER: &str = include_str!("../minijinja/highlight.user.jinja");
    pub const LANGUAGE_PARTIAL: &str = include_str!("../minijinja/_language.partial.jinja");
}

#[rustfmt::skip]
pub mod askama {
    pub const TITLE_SYSTEM: &str = include_str!("../askama/title.system.jinja");
    pub const TITLE_USER: &str = include_str!("../askama/title.user.jinja");
    pub const ENHANCE_SYSTEM: &str = include_str!("../askama/enhance.system.jinja");
    pub const ENHANCE_USER: &str = include_str!("../askama/enhance.user.jinja");
}
