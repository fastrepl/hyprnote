use markdown::mdast;

pub fn tiptap_json_to_mdast(json: &serde_json::Value) -> mdast::Node {
    let children = convert_content(json);
    mdast::Node::Root(mdast::Root {
        children,
        position: None,
    })
}

fn convert_content(json: &serde_json::Value) -> Vec<mdast::Node> {
    let Some(content) = json.get("content").and_then(|c| c.as_array()) else {
        return vec![];
    };

    content.iter().filter_map(convert_node).collect()
}

fn convert_node(node: &serde_json::Value) -> Option<mdast::Node> {
    let node_type = node.get("type")?.as_str()?;

    match node_type {
        "paragraph" => Some(convert_paragraph(node)),
        "heading" => Some(convert_heading(node)),
        "bulletList" => Some(convert_bullet_list(node)),
        "orderedList" => Some(convert_ordered_list(node)),
        "listItem" => Some(convert_list_item(node)),
        "codeBlock" => Some(convert_code_block(node)),
        "blockquote" => Some(convert_blockquote(node)),
        "horizontalRule" => Some(convert_horizontal_rule()),
        "hardBreak" => Some(convert_hard_break()),
        "text" => convert_text(node),
        _ => None,
    }
}

fn convert_paragraph(node: &serde_json::Value) -> mdast::Node {
    let children = convert_inline_content(node);
    mdast::Node::Paragraph(mdast::Paragraph {
        children,
        position: None,
    })
}

fn convert_heading(node: &serde_json::Value) -> mdast::Node {
    let depth = node
        .get("attrs")
        .and_then(|a| a.get("level"))
        .and_then(|l| l.as_u64())
        .unwrap_or(1) as u8;

    let children = convert_inline_content(node);
    mdast::Node::Heading(mdast::Heading {
        depth,
        children,
        position: None,
    })
}

fn convert_bullet_list(node: &serde_json::Value) -> mdast::Node {
    let children = convert_list_items(node);
    mdast::Node::List(mdast::List {
        ordered: false,
        start: None,
        spread: false,
        children,
        position: None,
    })
}

fn convert_ordered_list(node: &serde_json::Value) -> mdast::Node {
    let start = node
        .get("attrs")
        .and_then(|a| a.get("start"))
        .and_then(|s| s.as_u64())
        .map(|s| s as u32);

    let children = convert_list_items(node);
    mdast::Node::List(mdast::List {
        ordered: true,
        start,
        spread: false,
        children,
        position: None,
    })
}

fn convert_list_items(node: &serde_json::Value) -> Vec<mdast::Node> {
    let Some(content) = node.get("content").and_then(|c| c.as_array()) else {
        return vec![];
    };

    content
        .iter()
        .filter_map(|item| {
            let item_type = item.get("type")?.as_str()?;
            if item_type == "listItem" {
                Some(convert_list_item(item))
            } else {
                None
            }
        })
        .collect()
}

fn convert_list_item(node: &serde_json::Value) -> mdast::Node {
    let children = convert_content(node);
    mdast::Node::ListItem(mdast::ListItem {
        checked: None,
        spread: false,
        children,
        position: None,
    })
}

fn convert_code_block(node: &serde_json::Value) -> mdast::Node {
    let lang = node
        .get("attrs")
        .and_then(|a| a.get("language"))
        .and_then(|l| l.as_str())
        .map(|s| s.to_string());

    let value = node
        .get("content")
        .and_then(|c| c.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|n| n.get("text").and_then(|t| t.as_str()))
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default();

    mdast::Node::Code(mdast::Code {
        value,
        lang,
        meta: None,
        position: None,
    })
}

fn convert_blockquote(node: &serde_json::Value) -> mdast::Node {
    let children = convert_content(node);
    mdast::Node::Blockquote(mdast::Blockquote {
        children,
        position: None,
    })
}

fn convert_horizontal_rule() -> mdast::Node {
    mdast::Node::ThematicBreak(mdast::ThematicBreak { position: None })
}

fn convert_hard_break() -> mdast::Node {
    mdast::Node::Break(mdast::Break { position: None })
}

fn convert_text(node: &serde_json::Value) -> Option<mdast::Node> {
    let text = node.get("text")?.as_str()?;
    Some(mdast::Node::Text(mdast::Text {
        value: text.to_string(),
        position: None,
    }))
}

fn convert_inline_content(node: &serde_json::Value) -> Vec<mdast::Node> {
    let Some(content) = node.get("content").and_then(|c| c.as_array()) else {
        return vec![];
    };

    content.iter().filter_map(convert_inline_node).collect()
}

fn convert_inline_node(node: &serde_json::Value) -> Option<mdast::Node> {
    let node_type = node.get("type")?.as_str()?;

    match node_type {
        "text" => convert_text_with_marks(node),
        "hardBreak" => Some(convert_hard_break()),
        _ => None,
    }
}

fn convert_text_with_marks(node: &serde_json::Value) -> Option<mdast::Node> {
    let text = node.get("text")?.as_str()?;
    let marks = node.get("marks").and_then(|m| m.as_array());

    let text_node = mdast::Node::Text(mdast::Text {
        value: text.to_string(),
        position: None,
    });

    let Some(marks) = marks else {
        return Some(text_node);
    };

    let mut result = text_node;

    for mark in marks.iter().rev() {
        let mark_type = mark.get("type").and_then(|t| t.as_str());
        result = match mark_type {
            Some("bold") | Some("strong") => mdast::Node::Strong(mdast::Strong {
                children: vec![result],
                position: None,
            }),
            Some("italic") | Some("em") => mdast::Node::Emphasis(mdast::Emphasis {
                children: vec![result],
                position: None,
            }),
            Some("code") => {
                if let mdast::Node::Text(t) = result {
                    mdast::Node::InlineCode(mdast::InlineCode {
                        value: t.value,
                        position: None,
                    })
                } else {
                    result
                }
            }
            Some("link") => {
                let url = mark
                    .get("attrs")
                    .and_then(|a| a.get("href"))
                    .and_then(|h| h.as_str())
                    .unwrap_or("")
                    .to_string();
                let title = mark
                    .get("attrs")
                    .and_then(|a| a.get("title"))
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string());

                mdast::Node::Link(mdast::Link {
                    url,
                    title,
                    children: vec![result],
                    position: None,
                })
            }
            Some("strike") => mdast::Node::Delete(mdast::Delete {
                children: vec![result],
                position: None,
            }),
            _ => result,
        };
    }

    Some(result)
}

pub fn mdast_to_markdown(node: &mdast::Node) -> Result<String, String> {
    mdast_util_to_markdown::to_markdown_with_options(
        node,
        &mdast_util_to_markdown::Options {
            bullet: '-',
            ..Default::default()
        },
    )
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_paragraph() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Hello, world!"
                        }
                    ]
                }
            ]
        });

        let mdast = tiptap_json_to_mdast(&json);
        let md = mdast_to_markdown(&mdast).unwrap();
        assert_eq!(md.trim(), "Hello, world!");
    }

    #[test]
    fn test_heading() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "heading",
                    "attrs": { "level": 2 },
                    "content": [
                        {
                            "type": "text",
                            "text": "My Heading"
                        }
                    ]
                }
            ]
        });

        let mdast = tiptap_json_to_mdast(&json);
        let md = mdast_to_markdown(&mdast).unwrap();
        assert_eq!(md.trim(), "## My Heading");
    }

    #[test]
    fn test_bold_text() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "bold text",
                            "marks": [{ "type": "bold" }]
                        }
                    ]
                }
            ]
        });

        let mdast = tiptap_json_to_mdast(&json);
        let md = mdast_to_markdown(&mdast).unwrap();
        assert!(md.contains("**bold text**"));
    }

    #[test]
    fn test_bullet_list() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        { "type": "text", "text": "Item 1" }
                                    ]
                                }
                            ]
                        },
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        { "type": "text", "text": "Item 2" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        let mdast = tiptap_json_to_mdast(&json);
        let md = mdast_to_markdown(&mdast).unwrap();
        assert!(md.contains("- Item 1"));
        assert!(md.contains("- Item 2"));
    }
}
