use std::sync::Mutex;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("failed to parse markdown")]
    MarkdownParseError(String),
    #[error("failed to render markdown")]
    MarkdownRenderError(String),
}

pub struct Buffer {
    content: Mutex<String>,
}

impl Buffer {
    pub fn new() -> Self {
        Self {
            content: Mutex::new(String::new()),
        }
    }

    pub fn write(&self, s: &str) {
        let mut content = self.content.lock().unwrap();
        content.push_str(s);
    }

    pub fn read(&self) -> Result<String, Error> {
        let content = self.content.lock().unwrap();
        md_to_html(&content)
    }
}

fn md_to_html(md: &str) -> Result<String, Error> {
    let mut ast = markdown::to_mdast(md, &markdown::ParseOptions::default())
        .map_err(|e| Error::MarkdownParseError(e.to_string()))?;

    convert_ordered_to_unordered(&mut ast);
    set_heading_level_to_2(&mut ast);

    let md = mdast_util_to_markdown::to_markdown_with_options(
        &ast,
        &mdast_util_to_markdown::Options::default(),
    )
    .map_err(|e| Error::MarkdownRenderError(e.to_string()))?;

    let html = markdown::to_html(&md);
    Ok(html)
}

fn convert_ordered_to_unordered(node: &mut markdown::mdast::Node) {
    if let markdown::mdast::Node::List(list) = node {
        list.ordered = false;
        list.spread = false;
    }

    if let Some(children) = node.children_mut() {
        for child in children {
            convert_ordered_to_unordered(child);
        }
    }
}

fn set_heading_level_to_2(node: &mut markdown::mdast::Node) {
    if let markdown::mdast::Node::Heading(heading) = node {
        heading.depth = 2;
    }

    if let Some(children) = node.children_mut() {
        for child in children {
            set_heading_level_to_2(child);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple() {
        let buffer = Buffer::new();

        buffer.write("# Hello, ");
        buffer.write("world!\n");
        buffer.write("1. Hi\n");
        buffer.write("2. Bye!");

        let result = buffer.read().unwrap();
        assert_eq!(
            result,
            "<h2>Hello, world!</h2>\n<ul>\n<li>Hi</li>\n<li>Bye!</li>\n</ul>\n"
        );
    }
}
