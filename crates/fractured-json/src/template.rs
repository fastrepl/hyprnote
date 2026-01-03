use crate::item::{JsonItem, JsonItemType};
use crate::options::NumberListAlignment;
use crate::padded_tokens::{BracketPaddingType, PaddedFormattingTokens};

/// Type of the column, for table formatting purposes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TableColumnType {
    Unknown,
    Number,
    Array,
    Object,
    Simple,
    Mixed,
}

/// Collects spacing information about the columns of a potential table.
#[derive(Debug, Clone)]
pub struct TableTemplate {
    /// The property name in the table that this segment matches up with.
    pub location_in_parent: Option<String>,

    /// Type of the column, for table formatting purposes.
    pub column_type: TableColumnType,

    /// Number of rows measured.
    pub row_count: usize,

    /// Length of the longest property name.
    pub name_length: usize,

    /// Length of the shortest property name.
    pub name_minimum: usize,

    /// Largest length for the value parts of the column.
    pub max_value_length: usize,

    /// Length of the largest value that can't be split apart.
    pub max_atomic_value_length: usize,

    pub prefix_comment_length: usize,
    pub middle_comment_length: usize,
    pub any_middle_comment_has_newline: bool,
    pub postfix_comment_length: usize,
    pub is_any_post_comment_line_style: bool,
    pub pad_type: BracketPaddingType,
    pub requires_multiple_lines: bool,

    /// Length of the value for this template when things are complicated.
    pub composite_value_length: usize,

    /// Length of the entire template, including space for the value, property name, and all comments.
    pub total_length: usize,

    /// If the row contains non-empty array or objects whose value is shorter than the literal null.
    pub shorter_than_null_adjustment: usize,

    /// True if at least one row in the column this represents has a null value.
    pub contains_null: bool,

    /// Sub-templates for array/object children.
    pub children: Vec<TableTemplate>,

    // Number alignment fields
    number_list_alignment: NumberListAlignment,
    max_dig_before_dec: usize,
    max_dig_after_dec: usize,

    // Reference to pads for calculations
    pads_colon_len: usize,
    pads_comma_len: usize,
    pads_comment_len: usize,
    pads_literal_null_len: usize,
}

impl TableTemplate {
    pub fn new(pads: &PaddedFormattingTokens, number_list_alignment: NumberListAlignment) -> Self {
        Self {
            location_in_parent: None,
            column_type: TableColumnType::Unknown,
            row_count: 0,
            name_length: 0,
            name_minimum: usize::MAX,
            max_value_length: 0,
            max_atomic_value_length: 0,
            prefix_comment_length: 0,
            middle_comment_length: 0,
            any_middle_comment_has_newline: false,
            postfix_comment_length: 0,
            is_any_post_comment_line_style: false,
            pad_type: BracketPaddingType::Simple,
            requires_multiple_lines: false,
            composite_value_length: 0,
            total_length: 0,
            shorter_than_null_adjustment: 0,
            contains_null: false,
            children: Vec::new(),
            number_list_alignment,
            max_dig_before_dec: 0,
            max_dig_after_dec: 0,
            pads_colon_len: pads.colon_len,
            pads_comma_len: pads.comma_len,
            pads_comment_len: pads.comment_len,
            pads_literal_null_len: pads.literal_null_len,
        }
    }

    /// Analyzes an object/array for formatting as a table.
    pub fn measure_table_root(&mut self, table_root: &JsonItem, pads: &PaddedFormattingTokens, recursive: bool) {
        for child in &table_root.children {
            self.measure_row_segment(child, pads, recursive);
        }
        self.prune_and_recompute(pads, i32::MAX);
    }

    /// Check if the template's width fits in the given size.
    pub fn try_to_fit(&mut self, pads: &PaddedFormattingTokens, maximum_length: usize) -> bool {
        let mut complexity = self.get_template_complexity();
        loop {
            if self.total_length <= maximum_length {
                return true;
            }
            if complexity <= 0 {
                return false;
            }
            complexity -= 1;
            self.prune_and_recompute(pads, complexity);
        }
    }

    /// Length of the largest item that can't be split across multiple lines.
    pub fn atomic_item_size(&self) -> usize {
        self.name_length
            + self.pads_colon_len
            + self.middle_comment_length
            + if self.middle_comment_length > 0 { self.pads_comment_len } else { 0 }
            + self.max_atomic_value_length
            + self.postfix_comment_length
            + if self.postfix_comment_length > 0 { self.pads_comment_len } else { 0 }
            + self.pads_comma_len
    }

    fn measure_row_segment(&mut self, row_segment: &JsonItem, pads: &PaddedFormattingTokens, recursive: bool) {
        // Standalone comments and blank lines don't figure into template measurements
        if matches!(
            row_segment.item_type,
            JsonItemType::BlankLine | JsonItemType::BlockComment | JsonItemType::LineComment
        ) {
            return;
        }

        let row_table_type = match row_segment.item_type {
            JsonItemType::Null => TableColumnType::Unknown,
            JsonItemType::Number => TableColumnType::Number,
            JsonItemType::Array => TableColumnType::Array,
            JsonItemType::Object => TableColumnType::Object,
            _ => TableColumnType::Simple,
        };

        if self.column_type == TableColumnType::Unknown {
            self.column_type = row_table_type;
        } else if row_table_type != TableColumnType::Unknown && self.column_type != row_table_type {
            self.column_type = TableColumnType::Mixed;
        }

        if row_segment.item_type == JsonItemType::Null {
            self.max_dig_before_dec = self.max_dig_before_dec.max(pads.literal_null_len);
            self.contains_null = true;
        }

        if row_segment.requires_multiple_lines {
            self.requires_multiple_lines = true;
            self.column_type = TableColumnType::Mixed;
        }

        // Update the numbers
        self.row_count += 1;
        self.name_length = self.name_length.max(row_segment.name_length);
        self.name_minimum = self.name_minimum.min(row_segment.name_length);
        self.max_value_length = self.max_value_length.max(row_segment.value_length);
        self.middle_comment_length = self.middle_comment_length.max(row_segment.middle_comment_length);
        self.prefix_comment_length = self.prefix_comment_length.max(row_segment.prefix_comment_length);
        self.postfix_comment_length = self.postfix_comment_length.max(row_segment.postfix_comment_length);
        self.is_any_post_comment_line_style |= row_segment.is_post_comment_line_style;
        self.any_middle_comment_has_newline |= row_segment.middle_comment_has_newline;

        if !matches!(row_segment.item_type, JsonItemType::Array | JsonItemType::Object) {
            self.max_atomic_value_length = self.max_atomic_value_length.max(row_segment.value_length);
        }

        if row_segment.complexity >= 2 {
            self.pad_type = BracketPaddingType::Complex;
        }

        if self.requires_multiple_lines || row_segment.item_type == JsonItemType::Null {
            return;
        }

        if self.column_type == TableColumnType::Array && recursive {
            for (i, child) in row_segment.children.iter().enumerate() {
                if self.children.len() <= i {
                    self.children.push(TableTemplate::new(pads, self.number_list_alignment));
                }
                self.children[i].measure_row_segment(child, pads, true);
            }
        } else if self.column_type == TableColumnType::Object && recursive {
            // Check for duplicate keys
            let distinct_keys: std::collections::HashSet<_> =
                row_segment.children.iter().map(|c| &c.name).collect();
            if distinct_keys.len() != row_segment.children.len() {
                self.column_type = TableColumnType::Simple;
                return;
            }

            for child in &row_segment.children {
                let sub_template = self.children.iter_mut().find(|t| {
                    t.location_in_parent.as_ref() == Some(&child.name)
                });

                if let Some(template) = sub_template {
                    template.measure_row_segment(child, pads, true);
                } else {
                    let mut new_template = TableTemplate::new(pads, self.number_list_alignment);
                    new_template.location_in_parent = Some(child.name.clone());
                    new_template.measure_row_segment(child, pads, true);
                    self.children.push(new_template);
                }
            }
        }

        // Number alignment handling
        if self.column_type == TableColumnType::Number
            && !matches!(self.number_list_alignment, NumberListAlignment::Left | NumberListAlignment::Right)
        {
            let normalized_str = if self.number_list_alignment == NumberListAlignment::Normalize {
                if let Ok(parsed) = row_segment.value.parse::<f64>() {
                    if parsed.is_nan() || parsed.is_infinite() {
                        self.number_list_alignment = NumberListAlignment::Left;
                        return;
                    }
                    let formatted = format_number_general(parsed);
                    if formatted.len() > 16 || formatted.contains('E') || formatted.contains('e') {
                        self.number_list_alignment = NumberListAlignment::Left;
                        return;
                    }
                    // Check for underflow (non-zero becoming zero)
                    if parsed == 0.0 && !is_truly_zero(&row_segment.value) {
                        self.number_list_alignment = NumberListAlignment::Left;
                        return;
                    }
                    formatted
                } else {
                    self.number_list_alignment = NumberListAlignment::Left;
                    return;
                }
            } else {
                row_segment.value.clone()
            };

            let index_of_dot = normalized_str.find(|c| c == '.' || c == 'e' || c == 'E');
            if let Some(idx) = index_of_dot {
                self.max_dig_before_dec = self.max_dig_before_dec.max(idx);
                self.max_dig_after_dec = self.max_dig_after_dec.max(normalized_str.len() - idx - 1);
            } else {
                self.max_dig_before_dec = self.max_dig_before_dec.max(normalized_str.len());
            }
        }
    }

    fn prune_and_recompute(&mut self, pads: &PaddedFormattingTokens, max_allowed_complexity: i32) {
        if max_allowed_complexity <= 0
            || !matches!(self.column_type, TableColumnType::Array | TableColumnType::Object)
            || self.row_count < 2
        {
            self.children.clear();
        }

        for child in &mut self.children {
            child.prune_and_recompute(pads, max_allowed_complexity - 1);
        }

        if self.column_type == TableColumnType::Number {
            self.composite_value_length = self.get_number_field_width();
        } else if !self.children.is_empty() {
            let children_len: usize = self.children.iter().map(|c| c.total_length).sum();
            let commas_len = if self.children.len() > 1 {
                pads.comma_len * (self.children.len() - 1)
            } else {
                0
            };
            self.composite_value_length = children_len
                + commas_len
                + pads.arr_start_len(self.pad_type)
                + pads.arr_end_len(self.pad_type);

            if self.contains_null && self.composite_value_length < pads.literal_null_len {
                self.shorter_than_null_adjustment = pads.literal_null_len - self.composite_value_length;
                self.composite_value_length = pads.literal_null_len;
            }
        } else {
            self.composite_value_length = self.max_value_length;
        }

        self.total_length = if self.prefix_comment_length > 0 {
            self.prefix_comment_length + pads.comment_len
        } else {
            0
        } + if self.name_length > 0 {
            self.name_length + pads.colon_len
        } else {
            0
        } + if self.middle_comment_length > 0 {
            self.middle_comment_length + pads.comment_len
        } else {
            0
        } + self.composite_value_length
            + if self.postfix_comment_length > 0 {
                self.postfix_comment_length + pads.comment_len
            } else {
                0
            };
    }

    fn get_template_complexity(&self) -> i32 {
        if self.children.is_empty() {
            0
        } else {
            1 + self.children.iter().map(|c| c.get_template_complexity()).max().unwrap_or(0)
        }
    }

    fn get_number_field_width(&self) -> usize {
        match self.number_list_alignment {
            NumberListAlignment::Left | NumberListAlignment::Right => self.max_value_length,
            NumberListAlignment::Decimal | NumberListAlignment::Normalize => {
                if self.max_dig_after_dec > 0 {
                    self.max_dig_before_dec + 1 + self.max_dig_after_dec
                } else {
                    self.max_dig_before_dec
                }
            }
        }
    }

    /// Format a number according to the alignment settings.
    pub fn format_number(&self, value: &str, item_type: JsonItemType) -> (String, usize, usize) {
        if item_type == JsonItemType::Null {
            let left_pad = self.max_dig_before_dec.saturating_sub(4); // "null".len()
            let right_pad = self.composite_value_length.saturating_sub(self.max_dig_before_dec);
            return (value.to_string(), left_pad, right_pad);
        }

        match self.number_list_alignment {
            NumberListAlignment::Left => {
                let right_pad = self.max_value_length.saturating_sub(value.len());
                (value.to_string(), 0, right_pad)
            }
            NumberListAlignment::Right => {
                let left_pad = self.max_value_length.saturating_sub(value.len());
                (value.to_string(), left_pad, 0)
            }
            NumberListAlignment::Normalize => {
                if let Ok(parsed) = value.parse::<f64>() {
                    let formatted = format!("{:.prec$}", parsed, prec = self.max_dig_after_dec);
                    let left_pad = self.composite_value_length.saturating_sub(formatted.len());
                    (formatted, left_pad, 0)
                } else {
                    (value.to_string(), 0, 0)
                }
            }
            NumberListAlignment::Decimal => {
                let index_of_dot = value.find(|c| c == '.' || c == 'e' || c == 'E');
                let (left_pad, right_pad) = if let Some(idx) = index_of_dot {
                    let left = self.max_dig_before_dec.saturating_sub(idx);
                    let right = self.composite_value_length.saturating_sub(left + value.len());
                    (left, right)
                } else {
                    let left = self.max_dig_before_dec.saturating_sub(value.len());
                    let right = self.composite_value_length.saturating_sub(self.max_dig_before_dec);
                    (left, right)
                };
                (value.to_string(), left_pad, right_pad)
            }
        }
    }
}

fn is_truly_zero(s: &str) -> bool {
    // Check if the string represents a true zero value
    let s = s.trim_start_matches('-');
    for c in s.chars() {
        match c {
            '0' | '.' => continue,
            'e' | 'E' => return true, // 0e... is still zero
            _ => return false,
        }
    }
    true
}

fn format_number_general(value: f64) -> String {
    // Format number similar to C#'s G format - general format
    // Uses scientific notation for very large/small numbers, otherwise decimal
    let abs_val = value.abs();
    if abs_val == 0.0 {
        return "0".to_string();
    }
    if abs_val >= 1e15 || abs_val < 1e-4 {
        format!("{:E}", value)
    } else {
        // Remove trailing zeros after decimal point
        let s = format!("{}", value);
        s
    }
}
