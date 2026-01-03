use serde_json::Value;

/// The type of a JSON item.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JsonItemType {
    Null,
    True,
    False,
    Number,
    String,
    Array,
    Object,
    BlankLine,
    BlockComment,
    LineComment,
}

/// A distinct thing that can be where ever JSON values are expected in a JSON document.
/// This could be an actual data value, such as a string, number, array, etc., or it could be
/// a blank line or standalone comment.
#[derive(Debug, Clone)]
pub struct JsonItem {
    /// The type of item - string, blank line, etc.
    pub item_type: JsonItemType,

    /// Nesting level of this item's contents if any. A simple item, or an empty array or object,
    /// has a complexity of zero. Non-empty arrays/objects have a complexity 1 greater than that
    /// of their child with the greatest complexity.
    pub complexity: usize,

    /// Property name, if this is an element that is contained in an object.
    pub name: String,

    /// The text value of this item, non-recursively. Empty for objects and arrays.
    pub value: String,

    /// Comment that belongs in front of this element on the same line, if any.
    pub prefix_comment: String,

    /// Comment that belongs in between the property name and value, if any.
    pub middle_comment: String,

    /// True if there's a line-style middle comment or a block style one with a newline in it.
    pub middle_comment_has_newline: bool,

    /// Comment that belongs after this element on the same line, if any.
    pub postfix_comment: String,

    /// True if the postfix comment is to-end-of-line rather than block style.
    pub is_post_comment_line_style: bool,

    /// String length of the name part.
    pub name_length: usize,

    /// String length of the value part. If it's an array or object, it's the sum of the children,
    /// with padding and brackets.
    pub value_length: usize,

    /// Length of the comment at the front of the item, if any.
    pub prefix_comment_length: usize,

    /// Length of the comment in the middle of the item, if any.
    pub middle_comment_length: usize,

    /// Length of the comment at the end of the item, if any.
    pub postfix_comment_length: usize,

    /// The smallest possible size this item - including all comments and children if appropriate -
    /// can be written.
    pub minimum_total_length: usize,

    /// True if this item can't be written on a single line.
    pub requires_multiple_lines: bool,

    /// List of this item's contents, if it's an array or object.
    pub children: Vec<JsonItem>,
}

impl Default for JsonItem {
    fn default() -> Self {
        Self {
            item_type: JsonItemType::Null,
            complexity: 0,
            name: String::new(),
            value: String::new(),
            prefix_comment: String::new(),
            middle_comment: String::new(),
            middle_comment_has_newline: false,
            postfix_comment: String::new(),
            is_post_comment_line_style: false,
            name_length: 0,
            value_length: 0,
            prefix_comment_length: 0,
            middle_comment_length: 0,
            postfix_comment_length: 0,
            minimum_total_length: 0,
            requires_multiple_lines: false,
            children: Vec::new(),
        }
    }
}

impl JsonItem {
    /// Convert a serde_json::Value to a JsonItem tree.
    pub fn from_value(value: &Value, prop_name: Option<&str>) -> Self {
        let (item_type, complexity, children, value_str) = match value {
            Value::Null => (JsonItemType::Null, 0, Vec::new(), "null".to_string()),
            Value::Bool(true) => (JsonItemType::True, 0, Vec::new(), "true".to_string()),
            Value::Bool(false) => (JsonItemType::False, 0, Vec::new(), "false".to_string()),
            Value::Number(n) => (JsonItemType::Number, 0, Vec::new(), n.to_string()),
            Value::String(s) => {
                let escaped = escape_json_string(s);
                (JsonItemType::String, 0, Vec::new(), escaped)
            }
            Value::Array(arr) => {
                let children: Vec<JsonItem> = arr
                    .iter()
                    .map(|v| JsonItem::from_value(v, None))
                    .collect();
                let complexity = if children.is_empty() {
                    0
                } else {
                    children.iter().map(|c| c.complexity).max().unwrap_or(0) + 1
                };
                (JsonItemType::Array, complexity, children, String::new())
            }
            Value::Object(obj) => {
                let children: Vec<JsonItem> = obj
                    .iter()
                    .map(|(k, v)| JsonItem::from_value(v, Some(k)))
                    .collect();
                let complexity = if children.is_empty() {
                    0
                } else {
                    children.iter().map(|c| c.complexity).max().unwrap_or(0) + 1
                };
                (JsonItemType::Object, complexity, children, String::new())
            }
        };

        let name = prop_name
            .map(|n| format!("\"{}\"", escape_string_content(n)))
            .unwrap_or_default();

        JsonItem {
            item_type,
            complexity,
            name,
            value: value_str,
            children,
            ..Default::default()
        }
    }
}

/// Escape a string for JSON output (with quotes).
fn escape_json_string(s: &str) -> String {
    format!("\"{}\"", escape_string_content(s))
}

/// Escape string content (without quotes).
fn escape_string_content(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '"' => result.push_str("\\\""),
            '\\' => result.push_str("\\\\"),
            '\n' => result.push_str("\\n"),
            '\r' => result.push_str("\\r"),
            '\t' => result.push_str("\\t"),
            c if c.is_control() => {
                result.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => result.push(c),
        }
    }
    result
}
