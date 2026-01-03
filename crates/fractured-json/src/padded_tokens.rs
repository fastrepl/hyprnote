use crate::item::JsonItemType;
use crate::options::FracturedJsonOptions;

/// Type of bracket padding to use.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BracketPaddingType {
    Empty,
    Simple,
    Complex,
}

/// Pre-computed formatting tokens with padding based on options.
#[derive(Debug, Clone)]
pub struct PaddedFormattingTokens {
    pub eol: String,
    pub indent_unit: String,
    pub prefix_string_len: usize,

    pub colon: String,
    pub colon_len: usize,
    pub comma: String,
    pub comma_len: usize,
    pub comma_no_pad: String,
    pub dummy_comma: String,
    pub comment: String,
    pub comment_len: usize,

    pub arr_start_empty: String,
    pub arr_start_simple: String,
    pub arr_start_complex: String,
    pub arr_end_empty: String,
    pub arr_end_simple: String,
    pub arr_end_complex: String,

    pub obj_start_empty: String,
    pub obj_start_simple: String,
    pub obj_start_complex: String,
    pub obj_end_empty: String,
    pub obj_end_simple: String,
    pub obj_end_complex: String,

    pub literal_null_len: usize,
    pub literal_true_len: usize,
    pub literal_false_len: usize,
}

impl PaddedFormattingTokens {
    pub fn new(options: &FracturedJsonOptions) -> Self {
        let eol = options.eol_str().to_string();

        let indent_unit = if options.use_tab_to_indent {
            "\t".to_string()
        } else {
            " ".repeat(options.indent_spaces)
        };

        let colon = if options.colon_padding { ": " } else { ":" }.to_string();
        let comma = if options.comma_padding { ", " } else { "," }.to_string();
        let comma_no_pad = ",".to_string();
        let dummy_comma = " ".repeat(comma.len());
        let comment = if options.comment_padding { " " } else { "" }.to_string();

        let (arr_start_simple, arr_end_simple) = if options.simple_bracket_padding {
            ("[ ".to_string(), " ]".to_string())
        } else {
            ("[".to_string(), "]".to_string())
        };

        let (arr_start_complex, arr_end_complex) = if options.nested_bracket_padding {
            ("[ ".to_string(), " ]".to_string())
        } else {
            ("[".to_string(), "]".to_string())
        };

        let (obj_start_simple, obj_end_simple) = if options.simple_bracket_padding {
            ("{ ".to_string(), " }".to_string())
        } else {
            ("{".to_string(), "}".to_string())
        };

        let (obj_start_complex, obj_end_complex) = if options.nested_bracket_padding {
            ("{ ".to_string(), " }".to_string())
        } else {
            ("{".to_string(), "}".to_string())
        };

        Self {
            eol,
            indent_unit,
            prefix_string_len: options.prefix_string.len(),
            colon_len: colon.len(),
            colon,
            comma_len: comma.len(),
            comma,
            comma_no_pad,
            dummy_comma,
            comment_len: comment.len(),
            comment,
            arr_start_empty: "[".to_string(),
            arr_start_simple,
            arr_start_complex,
            arr_end_empty: "]".to_string(),
            arr_end_simple,
            arr_end_complex,
            obj_start_empty: "{".to_string(),
            obj_start_simple,
            obj_start_complex,
            obj_end_empty: "}".to_string(),
            obj_end_simple,
            obj_end_complex,
            literal_null_len: 4,
            literal_true_len: 4,
            literal_false_len: 5,
        }
    }

    pub fn indent(&self, depth: usize) -> String {
        self.indent_unit.repeat(depth)
    }

    pub fn arr_start(&self, pad_type: BracketPaddingType) -> &str {
        match pad_type {
            BracketPaddingType::Empty => &self.arr_start_empty,
            BracketPaddingType::Simple => &self.arr_start_simple,
            BracketPaddingType::Complex => &self.arr_start_complex,
        }
    }

    pub fn arr_end(&self, pad_type: BracketPaddingType) -> &str {
        match pad_type {
            BracketPaddingType::Empty => &self.arr_end_empty,
            BracketPaddingType::Simple => &self.arr_end_simple,
            BracketPaddingType::Complex => &self.arr_end_complex,
        }
    }

    pub fn obj_start(&self, pad_type: BracketPaddingType) -> &str {
        match pad_type {
            BracketPaddingType::Empty => &self.obj_start_empty,
            BracketPaddingType::Simple => &self.obj_start_simple,
            BracketPaddingType::Complex => &self.obj_start_complex,
        }
    }

    pub fn obj_end(&self, pad_type: BracketPaddingType) -> &str {
        match pad_type {
            BracketPaddingType::Empty => &self.obj_end_empty,
            BracketPaddingType::Simple => &self.obj_end_simple,
            BracketPaddingType::Complex => &self.obj_end_complex,
        }
    }

    pub fn start(&self, item_type: JsonItemType, pad_type: BracketPaddingType) -> &str {
        match item_type {
            JsonItemType::Array => self.arr_start(pad_type),
            JsonItemType::Object => self.obj_start(pad_type),
            _ => "",
        }
    }

    pub fn end(&self, item_type: JsonItemType, pad_type: BracketPaddingType) -> &str {
        match item_type {
            JsonItemType::Array => self.arr_end(pad_type),
            JsonItemType::Object => self.obj_end(pad_type),
            _ => "",
        }
    }

    pub fn start_len(&self, item_type: JsonItemType, pad_type: BracketPaddingType) -> usize {
        self.start(item_type, pad_type).len()
    }

    pub fn end_len(&self, item_type: JsonItemType, pad_type: BracketPaddingType) -> usize {
        self.end(item_type, pad_type).len()
    }

    pub fn arr_start_len(&self, pad_type: BracketPaddingType) -> usize {
        self.arr_start(pad_type).len()
    }

    pub fn arr_end_len(&self, pad_type: BracketPaddingType) -> usize {
        self.arr_end(pad_type).len()
    }
}
