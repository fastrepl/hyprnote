use markdown::{ParseOptions, to_mdast};

#[derive(Debug, Clone)]
pub struct FormatSpec {
    pub sections: Vec<SectionSpec>,
}

#[derive(Debug, Clone)]
pub struct SectionSpec {
    pub header: HeaderSpec,
    pub list_only: bool,
}

#[derive(Debug, Clone, Default)]
pub struct HeaderSpec {
    pub level: u8,
    pub text: String,
}

#[derive(Debug, Clone)]
struct ParsedSection {
    header: HeaderSpec,
    has_list: bool,
}

pub fn match_format(md: &str, spec: &FormatSpec) -> (bool, String) {
    if md.trim().is_empty() {
        return (false, "empty input".to_string());
    }

    let tree = match to_mdast(md, &ParseOptions::default()) {
        Ok(tree) => tree,
        Err(_) => return (false, "failed to parse markdown".to_string()),
    };

    let mut sections: Vec<ParsedSection> = Vec::new();
    let mut current_section: Option<ParsedSection> = None;

    if let markdown::mdast::Node::Root(root) = tree {
        for child in &root.children {
            match child {
                markdown::mdast::Node::Heading(heading) => {
                    let header_text = extract_text_from_children(&heading.children);

                    if let Some(section) = current_section.take() {
                        sections.push(section);
                    }
                    current_section = Some(ParsedSection {
                        header: HeaderSpec {
                            level: heading.depth,
                            text: header_text,
                        },
                        has_list: false,
                    });
                }
                markdown::mdast::Node::List(list) => {
                    if current_section.is_none() {
                        return (false, "list found before any header".to_string());
                    }
                    if list.ordered {
                        let header_text = current_section
                            .as_ref()
                            .map(|s| s.header.text.clone())
                            .unwrap_or_default();
                        return (
                            false,
                            format!(
                                "ordered list found under header {:?}, expected unordered",
                                header_text
                            ),
                        );
                    }
                    if let Some(ref mut section) = current_section {
                        section.has_list = true;
                    }
                }
                markdown::mdast::Node::Paragraph(_) => {
                    if current_section.is_none() {
                        return (false, "paragraph found before any header".to_string());
                    }
                    let header_text = current_section
                        .as_ref()
                        .map(|s| s.header.text.clone())
                        .unwrap_or_default();
                    return (
                        false,
                        format!(
                            "paragraph found under header {:?}, only lists allowed",
                            header_text
                        ),
                    );
                }
                markdown::mdast::Node::Code(_) => {
                    if current_section.is_none() {
                        return (false, "code block found before any header".to_string());
                    }
                    let header_text = current_section
                        .as_ref()
                        .map(|s| s.header.text.clone())
                        .unwrap_or_default();
                    return (
                        false,
                        format!(
                            "code block found under header {:?}, only lists allowed",
                            header_text
                        ),
                    );
                }
                markdown::mdast::Node::Blockquote(_) => {
                    if current_section.is_none() {
                        return (false, "blockquote found before any header".to_string());
                    }
                    let header_text = current_section
                        .as_ref()
                        .map(|s| s.header.text.clone())
                        .unwrap_or_default();
                    return (
                        false,
                        format!(
                            "blockquote found under header {:?}, only lists allowed",
                            header_text
                        ),
                    );
                }
                markdown::mdast::Node::ThematicBreak(_) => {
                    return (
                        false,
                        "thematic break (horizontal rule) not allowed".to_string(),
                    );
                }
                _ => {}
            }
        }
    }

    if let Some(section) = current_section {
        sections.push(section);
    }

    if sections.len() != spec.sections.len() {
        return (
            false,
            format!(
                "expected {} sections, got {}",
                spec.sections.len(),
                sections.len()
            ),
        );
    }

    for (i, expected) in spec.sections.iter().enumerate() {
        let actual = &sections[i];

        if expected.header.level != 0 && actual.header.level != expected.header.level {
            return (
                false,
                format!(
                    "section {}: expected h{}, got h{}",
                    i + 1,
                    expected.header.level,
                    actual.header.level
                ),
            );
        }

        if !expected.header.text.is_empty() && actual.header.text != expected.header.text {
            return (
                false,
                format!(
                    "section {}: expected header {:?}, got {:?}",
                    i + 1,
                    expected.header.text,
                    actual.header.text
                ),
            );
        }

        if expected.list_only && !actual.has_list {
            return (
                false,
                format!(
                    "section {} ({:?}): expected list content",
                    i + 1,
                    actual.header.text
                ),
            );
        }
    }

    (true, "format matches".to_string())
}

fn extract_text_from_children(children: &[markdown::mdast::Node]) -> String {
    let mut result = String::new();
    for child in children {
        if let markdown::mdast::Node::Text(text) = child {
            result.push_str(&text.value);
        }
    }
    result
}

pub fn format_matcher_grader(_spec: FormatSpec) -> fn(&str) -> (bool, String) {
    fn grader_fn(_output: &str) -> (bool, String) {
        (false, "format grader requires spec".to_string())
    }
    grader_fn
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_match_format_empty() {
        let spec = FormatSpec { sections: vec![] };
        let (passed, _) = match_format("", &spec);
        assert!(!passed);
    }

    #[test]
    fn test_match_format_simple() {
        let spec = FormatSpec {
            sections: vec![SectionSpec {
                header: HeaderSpec {
                    level: 1,
                    text: String::new(),
                },
                list_only: true,
            }],
        };
        let md = "# Title\n\n- item 1\n- item 2\n";
        let (passed, reason) = match_format(md, &spec);
        assert!(passed, "Failed: {}", reason);
    }

    #[test]
    fn test_match_format_two_sections() {
        let spec = FormatSpec {
            sections: vec![
                SectionSpec {
                    header: HeaderSpec {
                        level: 1,
                        text: String::new(),
                    },
                    list_only: true,
                },
                SectionSpec {
                    header: HeaderSpec {
                        level: 1,
                        text: String::new(),
                    },
                    list_only: true,
                },
            ],
        };
        let md = "# First\n\n- item 1\n\n# Second\n\n- item 2\n";
        let (passed, reason) = match_format(md, &spec);
        assert!(passed, "Failed: {}", reason);
    }
}
