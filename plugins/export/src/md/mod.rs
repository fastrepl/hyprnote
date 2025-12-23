mod from_ast;
mod to_ast;

pub use from_ast::*;
pub use to_ast::*;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::md::from_ast::mdast_to_markdown;

    fn to_md(json: serde_json::Value) -> String {
        let mdast = tiptap_json_to_mdast(&json);
        mdast_to_markdown(&mdast).unwrap()
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

        insta::assert_snapshot!(to_md(json), @r"
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
