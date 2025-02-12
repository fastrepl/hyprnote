use std::sync::Mutex;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("failed to parse markdown")]
    MarkdownParseError(String),
    #[error("failed to render markdown")]
    MarkdownRenderError(String),
    #[error("failed to render html")]
    HTMLRenderError(String),
    #[error("failed to parse html")]
    HTMLParseError(String),
}

pub struct Buffer {
    content: Mutex<String>,
}

impl Default for Buffer {
    fn default() -> Self {
        Buffer {
            content: Mutex::new(String::new()),
        }
    }
}

impl Buffer {
    pub fn write(&self, s: &str) {
        let mut content = self.content.lock().unwrap();
        content.push_str(s);
    }

    pub fn read(&self) -> Result<String, Error> {
        let content = self.content.lock().unwrap();
        opinionated_md_to_html(content.as_str())
    }
}

pub fn opinionated_md_to_html(text: impl AsRef<str>) -> Result<String, Error> {
    let md = md_to_md(text)?;
    md_to_html(&md)
}

fn md_to_md(text: impl AsRef<str>) -> Result<String, Error> {
    let mut ast = markdown::to_mdast(text.as_ref(), &markdown::ParseOptions::default())
        .map_err(|e| Error::MarkdownParseError(e.to_string()))?;

    convert_ordered_to_unordered(&mut ast);
    set_heading_level_from(&mut ast, 2, false);

    let md = mdast_util_to_markdown::to_markdown_with_options(
        &ast,
        &mdast_util_to_markdown::Options::default(),
    )
    .map_err(|e| Error::MarkdownRenderError(e.to_string()))?;

    Ok(md)
}

fn md_to_html(text: &str) -> Result<String, Error> {
    let html = markdown::to_html_with_options(
        &text,
        &markdown::Options {
            parse: markdown::ParseOptions::default(),
            compile: markdown::CompileOptions {
                allow_dangerous_html: true,
                ..Default::default()
            },
        },
    )
    .map_err(|e| Error::HTMLRenderError(e.to_string()))?;

    let dom = tl::parse(&html, tl::ParserOptions::default())
        .map_err(|e| Error::HTMLParseError(e.to_string()))?;

    Ok(dom.outer_html())
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

fn set_heading_level_from(node: &mut markdown::mdast::Node, depth: u8, header_found: bool) -> bool {
    let mut found_any_heading = header_found;

    if let markdown::mdast::Node::Heading(heading) = node {
        found_any_heading = true;
        heading.depth = depth;

        if let Some(children) = node.children_mut() {
            for child in children {
                set_heading_level_from(child, depth + 1, found_any_heading);
            }
        }
    } else if let Some(children) = node.children_mut() {
        for child in children {
            let child_found = set_heading_level_from(
                child,
                if found_any_heading { depth + 1 } else { depth },
                found_any_heading,
            );
            found_any_heading = found_any_heading || child_found;
        }
    }

    found_any_heading
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_1() {
        let buffer = Buffer::new();

        buffer.write("### Hello\n");
        buffer.write("#### World\n\n");
        buffer.write("1. Hi\n");
        buffer.write("2. Bye!");

        let result = buffer.read().unwrap();
        assert_eq!(
            result,
            "<h2>Hello</h2>\n<h3>World</h3>\n<ul>\n<li>Hi</li>\n<li>Bye!</li>\n</ul>\n"
        );
    }

    #[test]
    fn test_2() {
        let buffer = Buffer::new();

        buffer.write("hi\n");
        buffer.write("### World\n\n");
        buffer.write("1. Hi\n");
        buffer.write("2. Bye!\n");
        buffer.write("##### World\n\n");
        buffer.write("##### World\n\n");
        buffer.write("# World\n\n");

        let result = buffer.read().unwrap();
        assert_eq!(
            result,
            "<p>hi</p>\n<h2>World</h2>\n<ul>\n<li>Hi</li>\n<li>Bye!</li>\n</ul>\n<h3>World</h3>\n<h3>World</h3>\n<h3>World</h3>\n"
        );
    }

    #[test]
    fn test_3() {
        let buffer = Buffer::new();

        buffer.write("hi\n");
        buffer.write("<q>quote</q>\n\n");
        buffer.write("bye");

        let result = buffer.read().unwrap();
        assert_eq!(result, "<p>hi <q>quote </q></p>\n<p>bye</p>\n");
    }

    #[test]
    fn test_4() {
        let buffer = Buffer::new();

        buffer.write("hi\n");
        buffer.write("<q>quote");

        let result = buffer.read().unwrap();
        assert_eq!(result, "<p>hi <q>quote\n</q></p>");
    }
}
