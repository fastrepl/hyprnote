mod compile;
mod content;
mod markdown;
mod world;

pub use compile::compile_to_pdf;
pub use content::build_typst_content;

pub(super) fn escape_typst_string(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('#', "\\#")
        .replace('$', "\\$")
        .replace('[', "\\[")
        .replace(']', "\\]")
        .replace('{', "\\{")
        .replace('}', "\\}")
        .replace('<', "\\<")
        .replace('>', "\\>")
        .replace('@', "\\@")
        .replace('*', "\\*")
        .replace('_', "\\_")
}
