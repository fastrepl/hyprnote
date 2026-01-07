mod from_ast;
mod from_md;
mod to_ast;

pub use from_ast::mdast_to_markdown;
pub use from_md::md_to_tiptap_json;
pub use to_ast::tiptap_json_to_mdast;

pub fn tiptap_json_to_md(json: &serde_json::Value) -> Result<String, String> {
    let mdast = tiptap_json_to_mdast(json);
    mdast_to_markdown(&mdast)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn to_md(json: serde_json::Value) -> String {
        let mdast = tiptap_json_to_mdast(&json);
        mdast_to_markdown(&mdast).unwrap()
    }

    #[test]
    fn test_task_list() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "taskList",
                    "content": [
                        {
                            "type": "taskItem",
                            "attrs": { "checked": false },
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "unchecked task" }]
                            }]
                        },
                        {
                            "type": "taskItem",
                            "attrs": { "checked": true },
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "checked task" }]
                            }]
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r"
        - [ ] unchecked task
        - [x] checked task
        ");
    }

    #[test]
    fn test_image() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "image",
                            "attrs": {
                                "src": "https://example.com/image.png",
                                "alt": "example image",
                                "title": "Example"
                            }
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r#"![example image](https://example.com/image.png "Example")"#);
    }

    #[test]
    fn test_md_to_tiptap_basic() {
        let md = "# Hello\n\nWorld";
        let json = md_to_tiptap_json(md).unwrap();

        assert_eq!(json["type"], "doc");
        assert_eq!(json["content"][0]["type"], "heading");
        assert_eq!(json["content"][0]["attrs"]["level"], 1);
        assert_eq!(json["content"][1]["type"], "paragraph");
    }

    #[test]
    fn test_md_to_tiptap_task_list() {
        let md = "- [ ] unchecked\n- [x] checked";
        let json = md_to_tiptap_json(md).unwrap();

        assert_eq!(json["content"][0]["type"], "taskList");
        assert_eq!(json["content"][0]["content"][0]["type"], "taskItem");
        assert_eq!(json["content"][0]["content"][0]["attrs"]["checked"], false);
        assert_eq!(json["content"][0]["content"][1]["attrs"]["checked"], true);
    }

    #[test]
    fn test_tiptap_to_markdown() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "heading",
                    "attrs": { "level": 1 },
                    "content": [{ "type": "text", "text": "Title" }]
                },
                {
                    "type": "paragraph",
                    "content": [{ "type": "text", "text": "Hello, world!" }]
                },
                {
                    "type": "heading",
                    "attrs": { "level": 2 },
                    "content": [{ "type": "text", "text": "Formatting" }]
                },
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "This is " },
                        { "type": "text", "text": "bold", "marks": [{ "type": "bold" }] },
                        { "type": "text", "text": " and " },
                        { "type": "text", "text": "italic", "marks": [{ "type": "italic" }] },
                        { "type": "text", "text": " and " },
                        { "type": "text", "text": "code", "marks": [{ "type": "code" }] },
                        { "type": "text", "text": " text." }
                    ]
                },
                {
                    "type": "heading",
                    "attrs": { "level": 2 },
                    "content": [{ "type": "text", "text": "Lists" }]
                },
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "Bullet 1" }]
                            }]
                        },
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "Bullet 2" }]
                            }]
                        }
                    ]
                },
                {
                    "type": "orderedList",
                    "attrs": { "start": 1 },
                    "content": [
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "First" }]
                            }]
                        },
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "Second" }]
                            }]
                        }
                    ]
                },
                {
                    "type": "heading",
                    "attrs": { "level": 2 },
                    "content": [{ "type": "text", "text": "Other" }]
                },
                {
                    "type": "blockquote",
                    "content": [{
                        "type": "paragraph",
                        "content": [{ "type": "text", "text": "A quote" }]
                    }]
                },
                {
                    "type": "codeBlock",
                    "attrs": { "language": "rust" },
                    "content": [{ "type": "text", "text": "fn main() {}" }]
                },
                { "type": "horizontalRule" },
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "A ", "marks": [{ "type": "link", "attrs": { "href": "https://example.com" } }] },
                        { "type": "text", "text": "link", "marks": [{ "type": "link", "attrs": { "href": "https://example.com" } }] }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @"
        # Title

        Hello, world!

        ## Formatting

        This is **bold** and *italic* and `code` text.

        ## Lists

        - Bullet 1
        - Bullet 2

        1. First
        2. Second

        ## Other

        > A quote

        ```rust
        fn main() {}
        ```

        ***

        [A ](https://example.com)[link](https://example.com)
        ");
    }
}
