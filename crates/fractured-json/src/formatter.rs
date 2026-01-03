use crate::item::{JsonItem, JsonItemType};
use crate::options::{FracturedJsonOptions, NumberListAlignment, TableCommaPlacement};
use crate::padded_tokens::{BracketPaddingType, PaddedFormattingTokens};
use crate::template::{TableColumnType, TableTemplate};
use serde_json::Value;

/// A structure for formatting JSON data in a human-friendly way.
pub struct Formatter {
    pub options: FracturedJsonOptions,
}

impl Default for Formatter {
    fn default() -> Self {
        Self {
            options: FracturedJsonOptions::default(),
        }
    }
}

impl Formatter {
    /// Creates a new Formatter with default options.
    pub fn new() -> Self {
        Self::default()
    }

    /// Creates a new Formatter with the given options.
    pub fn with_options(options: FracturedJsonOptions) -> Self {
        Self { options }
    }

    /// Reads in JSON text and returns a nicely-formatted string of the same content.
    pub fn reformat(&self, json_text: &str, starting_depth: usize) -> Result<String, String> {
        let value: Value = serde_json::from_str(json_text)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        Ok(self.format_value(&value, starting_depth))
    }

    /// Formats a serde_json::Value into a nicely-formatted string.
    pub fn format_value(&self, value: &Value, starting_depth: usize) -> String {
        let mut item = JsonItem::from_value(value, None);
        let pads = PaddedFormattingTokens::new(&self.options);

        self.compute_item_lengths(&mut item, &pads);

        let mut buffer = String::new();
        self.format_item(&mut buffer, &item, starting_depth, false, None, &pads);

        buffer
    }

    /// Minifies JSON text by removing all unnecessary whitespace.
    pub fn minify(&self, json_text: &str) -> Result<String, String> {
        let value: Value = serde_json::from_str(json_text)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        Ok(self.minify_value(&value))
    }

    /// Minifies a serde_json::Value.
    pub fn minify_value(&self, value: &Value) -> String {
        value.to_string()
    }

    /// Computes lengths for all items recursively.
    fn compute_item_lengths(&self, item: &mut JsonItem, pads: &PaddedFormattingTokens) {
        for child in &mut item.children {
            self.compute_item_lengths(child, pads);
        }

        item.value_length = match item.item_type {
            JsonItemType::Null => pads.literal_null_len,
            JsonItemType::True => pads.literal_true_len,
            JsonItemType::False => pads.literal_false_len,
            _ => item.value.len(),
        };

        item.name_length = item.name.len();
        item.prefix_comment_length = item.prefix_comment.len();
        item.middle_comment_length = item.middle_comment.len();
        item.postfix_comment_length = item.postfix_comment.len();

        item.requires_multiple_lines = matches!(
            item.item_type,
            JsonItemType::BlankLine | JsonItemType::BlockComment | JsonItemType::LineComment
        ) || item.children.iter().any(|ch| ch.requires_multiple_lines || ch.is_post_comment_line_style)
            || item.prefix_comment.contains('\n')
            || item.middle_comment.contains('\n')
            || item.postfix_comment.contains('\n')
            || item.value.contains('\n');

        if matches!(item.item_type, JsonItemType::Array | JsonItemType::Object) {
            let pad_type = self.get_padding_type(item);
            let children_len: usize = item.children.iter().map(|ch| ch.minimum_total_length).sum();
            let commas_len = if item.children.len() > 1 {
                pads.comma_len * (item.children.len() - 1)
            } else {
                0
            };
            item.value_length = pads.start_len(item.item_type, pad_type)
                + pads.end_len(item.item_type, pad_type)
                + children_len
                + commas_len;
        }

        item.minimum_total_length = if item.prefix_comment_length > 0 {
            item.prefix_comment_length + pads.comment_len
        } else {
            0
        } + if item.name_length > 0 {
            item.name_length + pads.colon_len
        } else {
            0
        } + if item.middle_comment_length > 0 {
            item.middle_comment_length + pads.comment_len
        } else {
            0
        } + item.value_length
            + if item.postfix_comment_length > 0 {
                item.postfix_comment_length + pads.comment_len
            } else {
                0
            };
    }

    /// Formats any item to the buffer.
    fn format_item(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        include_trailing_comma: bool,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) {
        match item.item_type {
            JsonItemType::Array | JsonItemType::Object => {
                self.format_container(buffer, item, depth, include_trailing_comma, parent_template, pads);
            }
            JsonItemType::BlankLine => {
                self.format_blank_line(buffer, pads);
            }
            JsonItemType::BlockComment | JsonItemType::LineComment => {
                self.format_standalone_comment(buffer, item, depth, pads);
            }
            _ => {
                if item.requires_multiple_lines {
                    self.format_split_key_value(buffer, item, depth, include_trailing_comma, parent_template, pads);
                } else {
                    self.format_inline_element(buffer, item, depth, include_trailing_comma, parent_template, pads);
                }
            }
        }
    }

    /// Formats an array or object container.
    fn format_container(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        include_trailing_comma: bool,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) {
        // Try to inline or compact-multiline format, as long as we're deeper than always_expand_depth
        if depth as i32 > self.options.always_expand_depth {
            if self.format_container_inline(buffer, item, depth, include_trailing_comma, parent_template, pads) {
                return;
            }
        }

        // Create a helper object to measure how much space we'll need
        let recursive_template = item.complexity as i32 <= self.options.max_compact_array_complexity
            || item.complexity as i32 <= self.options.max_table_row_complexity + 1;
        let mut template = TableTemplate::new(pads, self.options.number_list_alignment);
        template.measure_table_root(item, pads, recursive_template);

        if depth as i32 > self.options.always_expand_depth {
            if self.format_container_compact_multiline(buffer, item, depth, include_trailing_comma, &template, parent_template, pads) {
                return;
            }
        }

        // Allow table formatting at the specified depth too
        if depth as i32 >= self.options.always_expand_depth {
            if self.format_container_table(buffer, item, depth, include_trailing_comma, &mut template.clone(), parent_template, pads) {
                return;
            }
        }

        self.format_container_expanded(buffer, item, depth, include_trailing_comma, &template, parent_template, pads);
    }

    /// Tries to format a container inline (single line).
    fn format_container_inline(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        include_trailing_comma: bool,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) -> bool {
        if item.requires_multiple_lines {
            return false;
        }

        let (prefix_length, name_length) = if let Some(pt) = parent_template {
            let prefix = if pt.prefix_comment_length > 0 {
                pt.prefix_comment_length + pads.comment_len
            } else {
                0
            };
            let name = if pt.name_length > 0 {
                pt.name_length + pads.colon_len
            } else {
                0
            };
            (prefix, name)
        } else {
            let prefix = if item.prefix_comment_length > 0 {
                item.prefix_comment_length + pads.comment_len
            } else {
                0
            };
            let name = if item.name_length > 0 {
                item.name_length + pads.colon_len
            } else {
                0
            };
            (prefix, name)
        };

        let middle_len = if item.middle_comment_length > 0 {
            item.middle_comment_length + pads.comment_len
        } else {
            0
        };
        let postfix_len = if item.postfix_comment_length > 0 {
            item.postfix_comment_length + pads.comment_len
        } else {
            0
        };
        let comma_len = if include_trailing_comma { pads.comma_len } else { 0 };

        let length_to_consider = prefix_length + name_length + middle_len + item.value_length + postfix_len + comma_len;

        if item.complexity as i32 > self.options.max_inline_complexity
            || length_to_consider > self.available_line_space(depth, pads)
        {
            return false;
        }

        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.indent(depth));
        self.inline_element_with_eol(buffer, item, include_trailing_comma, true, parent_template, pads);
        buffer.push_str(&pads.eol);

        true
    }

    /// Tries to format an array as compact multiline (multiple items per line).
    fn format_container_compact_multiline(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        include_trailing_comma: bool,
        template: &TableTemplate,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) -> bool {
        if item.item_type != JsonItemType::Array {
            return false;
        }
        if item.children.is_empty() || item.children.len() < self.options.min_compact_array_row_items {
            return false;
        }
        if item.complexity as i32 > self.options.max_compact_array_complexity {
            return false;
        }
        if item.requires_multiple_lines {
            return false;
        }

        let use_table_formatting = !matches!(template.column_type, TableColumnType::Unknown | TableColumnType::Mixed);

        // If we can't fit lots of them on a line, compact multiline isn't a good choice
        let likely_available_line_space = self.available_line_space(depth + 1, pads);
        let avg_item_width = pads.comma_len
            + if use_table_formatting {
                template.total_length
            } else {
                item.children.iter().map(|ch| ch.minimum_total_length).sum::<usize>() / item.children.len()
            };
        if avg_item_width * self.options.min_compact_array_row_items > likely_available_line_space {
            return false;
        }

        // Add prefix_string, indent, prefix comment, starting bracket
        let depth_after_colon = self.standard_format_start(buffer, item, depth, parent_template, pads);
        buffer.push_str(pads.start(item.item_type, BracketPaddingType::Empty));

        let available_line_space = self.available_line_space(depth_after_colon + 1, pads);
        let mut remaining_line_space: i32 = -1;

        for (i, child) in item.children.iter().enumerate() {
            let needs_comma = i < item.children.len() - 1;
            let current_item_width = if use_table_formatting {
                template.total_length
            } else {
                child.minimum_total_length
            };
            let space_needed_for_current = current_item_width + if needs_comma { pads.comma_len } else { 0 };

            // Check if we need to start a new line
            if remaining_line_space < space_needed_for_current as i32 {
                buffer.push_str(&pads.eol);
                buffer.push_str(&self.options.prefix_string);
                buffer.push_str(&pads.indent(depth_after_colon + 1));
                remaining_line_space = available_line_space as i32;
            }

            // Check if the NEXT element will fit on this line (to determine if this is end of line)
            let next_item_width = if i + 1 < item.children.len() {
                if use_table_formatting {
                    template.total_length
                } else {
                    item.children[i + 1].minimum_total_length
                }
            } else {
                0
            };
            let space_after_current = remaining_line_space - space_needed_for_current as i32;
            let is_end_of_line = !needs_comma || space_after_current < (next_item_width + pads.comma_len) as i32;

            if use_table_formatting {
                self.inline_table_row_segment(buffer, template, child, needs_comma, is_end_of_line, pads);
            } else {
                self.inline_element_with_eol(buffer, child, needs_comma, is_end_of_line, None, pads);
            }
            remaining_line_space -= space_needed_for_current as i32;
        }

        // End the line and add closing bracket
        buffer.push_str(&pads.eol);
        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.indent(depth_after_colon));
        buffer.push_str(pads.end(item.item_type, BracketPaddingType::Empty));

        self.standard_format_end(buffer, item, include_trailing_comma, pads);
        true
    }

    /// Tries to format a container as a table.
    fn format_container_table(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        include_trailing_comma: bool,
        template: &mut TableTemplate,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) -> bool {
        // If this element's children are too complex to be written inline, don't bother
        if item.complexity as i32 > self.options.max_table_row_complexity + 1 {
            return false;
        }

        // If any particular row would require multiple lines, we can't table format
        if template.requires_multiple_lines {
            return false;
        }

        let available_space_depth = if item.middle_comment_has_newline {
            depth + 2
        } else {
            depth + 1
        };
        let available_space = self.available_line_space(available_space_depth, pads).saturating_sub(pads.comma_len);

        // If any child element is too long even without formatting, don't bother
        let is_child_too_long = item.children.iter().any(|ch| {
            !matches!(
                ch.item_type,
                JsonItemType::BlankLine | JsonItemType::LineComment | JsonItemType::BlockComment
            ) && ch.minimum_total_length > available_space
        });
        if is_child_too_long {
            return false;
        }

        // Try to fit the template
        if !template.try_to_fit(pads, available_space) || template.column_type == TableColumnType::Mixed {
            return false;
        }

        let depth_after_colon = self.standard_format_start(buffer, item, depth, parent_template, pads);
        buffer.push_str(pads.start(item.item_type, BracketPaddingType::Empty));
        buffer.push_str(&pads.eol);

        let last_element_index = self.index_of_last_element(&item.children);
        for (i, row_item) in item.children.iter().enumerate() {
            if row_item.item_type == JsonItemType::BlankLine {
                self.format_blank_line(buffer, pads);
                continue;
            }
            if matches!(row_item.item_type, JsonItemType::LineComment | JsonItemType::BlockComment) {
                self.format_standalone_comment(buffer, row_item, depth_after_colon + 1, pads);
                continue;
            }

            buffer.push_str(&self.options.prefix_string);
            buffer.push_str(&pads.indent(depth_after_colon + 1));
            self.inline_table_row_segment(buffer, template, row_item, i < last_element_index, true, pads);
            buffer.push_str(&pads.eol);
        }

        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.indent(depth_after_colon));
        buffer.push_str(pads.end(item.item_type, BracketPaddingType::Empty));
        self.standard_format_end(buffer, item, include_trailing_comma, pads);

        true
    }

    /// Formats a container in expanded form (each child on its own line).
    fn format_container_expanded(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        include_trailing_comma: bool,
        template: &TableTemplate,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) {
        let depth_after_colon = self.standard_format_start(buffer, item, depth, parent_template, pads);
        buffer.push_str(pads.start(item.item_type, BracketPaddingType::Empty));
        buffer.push_str(&pads.eol);

        // Decide whether to align this container's property values
        let align_props = item.item_type == JsonItemType::Object
            && template.name_length.saturating_sub(template.name_minimum) <= self.options.max_prop_name_padding
            && !template.any_middle_comment_has_newline
            && self.available_line_space(depth + 1, pads) >= template.atomic_item_size();
        let template_to_pass = if align_props { Some(template) } else { None };

        let last_element_index = self.index_of_last_element(&item.children);
        for (i, child) in item.children.iter().enumerate() {
            self.format_item(buffer, child, depth_after_colon + 1, i < last_element_index, template_to_pass, pads);
        }

        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.indent(depth_after_colon));
        buffer.push_str(pads.end(item.item_type, BracketPaddingType::Empty));
        self.standard_format_end(buffer, item, include_trailing_comma, pads);
    }

    /// Formats a standalone comment.
    fn format_standalone_comment(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        pads: &PaddedFormattingTokens,
    ) {
        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.indent(depth));
        buffer.push_str(&item.value);
        buffer.push_str(&pads.eol);
    }

    /// Formats a blank line.
    fn format_blank_line(&self, buffer: &mut String, pads: &PaddedFormattingTokens) {
        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.eol);
    }

    /// Formats an inline element.
    fn format_inline_element(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        include_trailing_comma: bool,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) {
        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.indent(depth));
        self.inline_element(buffer, item, include_trailing_comma, parent_template, pads);
        buffer.push_str(&pads.eol);
    }

    /// Formats a split key/value (when middle comment spans multiple lines).
    fn format_split_key_value(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        include_trailing_comma: bool,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) {
        self.standard_format_start(buffer, item, depth, parent_template, pads);
        buffer.push_str(&item.value);
        self.standard_format_end(buffer, item, include_trailing_comma, pads);
    }

    /// Standard formatting for the start of an item.
    fn standard_format_start(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        depth: usize,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) -> usize {
        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.indent(depth));

        if let Some(pt) = parent_template {
            self.add_to_buffer_fixed(buffer, &item.prefix_comment, item.prefix_comment_length, pt.prefix_comment_length, &pads.comment, false);
            self.add_to_buffer_fixed(buffer, &item.name, item.name_length, pt.name_length, &pads.colon, self.options.colon_before_prop_name_padding);
        } else {
            self.add_to_buffer(buffer, &item.prefix_comment, item.prefix_comment_length, &pads.comment);
            self.add_to_buffer(buffer, &item.name, item.name_length, &pads.colon);
        }

        if item.middle_comment_length == 0 {
            return depth;
        }

        if !item.middle_comment_has_newline {
            let middle_pad = if let Some(pt) = parent_template {
                pt.middle_comment_length.saturating_sub(item.middle_comment_length)
            } else {
                0
            };
            buffer.push_str(&item.middle_comment);
            self.add_spaces(buffer, middle_pad);
            buffer.push_str(&pads.comment);
            return depth;
        }

        // If the middle comment requires multiple lines, start a new line
        buffer.push_str(&pads.eol);
        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.indent(depth + 1));
        buffer.push_str(&item.middle_comment);
        buffer.push_str(&pads.eol);
        buffer.push_str(&self.options.prefix_string);
        buffer.push_str(&pads.indent(depth + 1));

        depth + 1
    }

    /// Standard formatting for the end of an item.
    fn standard_format_end(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        include_trailing_comma: bool,
        pads: &PaddedFormattingTokens,
    ) {
        if include_trailing_comma && item.is_post_comment_line_style {
            buffer.push_str(&pads.comma_no_pad);
        }
        if item.postfix_comment_length > 0 {
            buffer.push_str(&pads.comment);
            buffer.push_str(&item.postfix_comment);
        }
        if include_trailing_comma && !item.is_post_comment_line_style {
            buffer.push_str(&pads.comma_no_pad);
        }
        buffer.push_str(&pads.eol);
    }

    /// Writes an element inline (without indentation/newlines).
    /// If `is_end_of_line` is true, uses comma without trailing space to avoid trailing whitespace.
    fn inline_element(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        include_trailing_comma: bool,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) {
        self.inline_element_with_eol(buffer, item, include_trailing_comma, false, parent_template, pads);
    }

    /// Writes an element inline with control over end-of-line comma handling.
    fn inline_element_with_eol(
        &self,
        buffer: &mut String,
        item: &JsonItem,
        include_trailing_comma: bool,
        is_end_of_line: bool,
        parent_template: Option<&TableTemplate>,
        pads: &PaddedFormattingTokens,
    ) {
        if let Some(pt) = parent_template {
            self.add_to_buffer_fixed(buffer, &item.prefix_comment, item.prefix_comment_length, pt.prefix_comment_length, &pads.comment, false);
            self.add_to_buffer_fixed(buffer, &item.name, item.name_length, pt.name_length, &pads.colon, self.options.colon_before_prop_name_padding);
            self.add_to_buffer_fixed(buffer, &item.middle_comment, item.middle_comment_length, pt.middle_comment_length, &pads.comment, false);
        } else {
            self.add_to_buffer(buffer, &item.prefix_comment, item.prefix_comment_length, &pads.comment);
            self.add_to_buffer(buffer, &item.name, item.name_length, &pads.colon);
            self.add_to_buffer(buffer, &item.middle_comment, item.middle_comment_length, &pads.comment);
        }

        self.inline_element_raw(buffer, item, pads);

        // Use comma without trailing space at end of line to avoid trailing whitespace
        let comma = if is_end_of_line { &pads.comma_no_pad } else { &pads.comma };

        if include_trailing_comma && item.is_post_comment_line_style {
            buffer.push_str(comma);
        }
        if item.postfix_comment_length > 0 {
            buffer.push_str(&pads.comment);
            buffer.push_str(&item.postfix_comment);
        }
        if include_trailing_comma && !item.is_post_comment_line_style {
            buffer.push_str(comma);
        }
    }

    /// Writes just the value of an element inline.
    fn inline_element_raw(&self, buffer: &mut String, item: &JsonItem, pads: &PaddedFormattingTokens) {
        match item.item_type {
            JsonItemType::Array => {
                let pad_type = self.get_padding_type(item);
                buffer.push_str(pads.arr_start(pad_type));
                for (i, child) in item.children.iter().enumerate() {
                    self.inline_element(buffer, child, i < item.children.len() - 1, None, pads);
                }
                buffer.push_str(pads.arr_end(pad_type));
            }
            JsonItemType::Object => {
                let pad_type = self.get_padding_type(item);
                buffer.push_str(pads.obj_start(pad_type));
                for (i, child) in item.children.iter().enumerate() {
                    self.inline_element(buffer, child, i < item.children.len() - 1, None, pads);
                }
                buffer.push_str(pads.obj_end(pad_type));
            }
            _ => {
                buffer.push_str(&item.value);
            }
        }
    }

    /// Writes a table row segment.
    fn inline_table_row_segment(
        &self,
        buffer: &mut String,
        template: &TableTemplate,
        item: &JsonItem,
        include_trailing_comma: bool,
        is_whole_row: bool,
        pads: &PaddedFormattingTokens,
    ) {
        self.add_to_buffer_fixed(buffer, &item.prefix_comment, item.prefix_comment_length, template.prefix_comment_length, &pads.comment, false);
        self.add_to_buffer_fixed(buffer, &item.name, item.name_length, template.name_length, &pads.colon, self.options.colon_before_prop_name_padding);
        self.add_to_buffer_fixed(buffer, &item.middle_comment, item.middle_comment_length, template.middle_comment_length, &pads.comment, false);

        // Determine comma placement
        let comma_before_pad = self.options.table_comma_placement == TableCommaPlacement::BeforePadding
            || (self.options.table_comma_placement == TableCommaPlacement::BeforePaddingExceptNumbers
                && template.column_type != TableColumnType::Number);

        // Use comma without trailing space at end of rows to avoid trailing whitespace
        let comma_type = if include_trailing_comma {
            if is_whole_row {
                &pads.comma_no_pad
            } else {
                &pads.comma
            }
        } else if is_whole_row {
            ""  // No dummy comma at end of row
        } else {
            &pads.dummy_comma
        };

        if !template.children.is_empty() && item.item_type != JsonItemType::Null {
            if template.column_type == TableColumnType::Array {
                self.inline_table_raw_array(buffer, template, item, pads);
            } else {
                self.inline_table_raw_object(buffer, template, item, pads);
            }
            if comma_before_pad {
                buffer.push_str(comma_type);
            }
            if template.shorter_than_null_adjustment > 0 {
                self.add_spaces(buffer, template.shorter_than_null_adjustment);
            }
        } else if template.column_type == TableColumnType::Number {
            let (formatted, left_pad, right_pad) = template.format_number(&item.value, item.item_type);
            self.add_spaces(buffer, left_pad);
            buffer.push_str(&formatted);
            if comma_before_pad {
                buffer.push_str(comma_type);
            }
            self.add_spaces(buffer, right_pad);
        } else {
            self.inline_element_raw(buffer, item, pads);
            if comma_before_pad {
                buffer.push_str(comma_type);
            }
            self.add_spaces(buffer, template.composite_value_length.saturating_sub(item.value_length));
        }

        if !comma_before_pad {
            buffer.push_str(comma_type);
        }

        if template.postfix_comment_length > 0 {
            buffer.push_str(&pads.comment);
            buffer.push_str(&item.postfix_comment);
            // Only add padding for postfix comments if we're not at the end of a row
            if !is_whole_row {
                self.add_spaces(buffer, template.postfix_comment_length.saturating_sub(item.postfix_comment_length));
            }
        }
    }

    /// Writes an array value for table formatting.
    fn inline_table_raw_array(
        &self,
        buffer: &mut String,
        template: &TableTemplate,
        item: &JsonItem,
        pads: &PaddedFormattingTokens,
    ) {
        buffer.push_str(pads.arr_start(template.pad_type));
        for (i, sub_template) in template.children.iter().enumerate() {
            let is_last_in_template = i == template.children.len() - 1;
            let is_last_in_array = i == item.children.len().saturating_sub(1);
            let is_past_end = i >= item.children.len();

            if is_past_end {
                self.add_spaces(buffer, sub_template.total_length);
                if !is_last_in_template {
                    buffer.push_str(&pads.dummy_comma);
                }
            } else {
                self.inline_table_row_segment(buffer, sub_template, &item.children[i], !is_last_in_array, false, pads);
                if is_last_in_array && !is_last_in_template {
                    buffer.push_str(&pads.dummy_comma);
                }
            }
        }
        buffer.push_str(pads.arr_end(template.pad_type));
    }

    /// Writes an object value for table formatting.
    fn inline_table_raw_object(
        &self,
        buffer: &mut String,
        template: &TableTemplate,
        item: &JsonItem,
        pads: &PaddedFormattingTokens,
    ) {
        let matches: Vec<_> = template
            .children
            .iter()
            .map(|sub| {
                let matching_child = item.children.iter().find(|ch| {
                    sub.location_in_parent.as_ref() == Some(&ch.name)
                });
                (sub, matching_child)
            })
            .collect();

        let last_non_null_idx = matches
            .iter()
            .enumerate()
            .rev()
            .find(|(_, (_, child))| child.is_some())
            .map(|(i, _)| i)
            .unwrap_or(0);

        buffer.push_str(pads.obj_start(template.pad_type));
        for (i, (sub_template, sub_item)) in matches.iter().enumerate() {
            let is_last_in_object = i == last_non_null_idx;
            let is_last_in_template = i == matches.len() - 1;

            if let Some(item) = sub_item {
                self.inline_table_row_segment(buffer, sub_template, item, !is_last_in_object, false, pads);
                if is_last_in_object && !is_last_in_template {
                    buffer.push_str(&pads.dummy_comma);
                }
            } else {
                self.add_spaces(buffer, sub_template.total_length);
                if !is_last_in_template {
                    buffer.push_str(&pads.dummy_comma);
                }
            }
        }
        buffer.push_str(pads.obj_end(template.pad_type));
    }

    fn get_padding_type(&self, item: &JsonItem) -> BracketPaddingType {
        if item.children.is_empty() {
            BracketPaddingType::Empty
        } else if item.complexity >= 2 {
            BracketPaddingType::Complex
        } else {
            BracketPaddingType::Simple
        }
    }

    fn available_line_space(&self, depth: usize, pads: &PaddedFormattingTokens) -> usize {
        self.options
            .max_total_line_length
            .saturating_sub(pads.prefix_string_len)
            .saturating_sub(self.options.indent_spaces * depth)
    }

    fn index_of_last_element(&self, children: &[JsonItem]) -> usize {
        children
            .iter()
            .enumerate()
            .rev()
            .find(|(_, ch)| {
                !matches!(
                    ch.item_type,
                    JsonItemType::BlankLine | JsonItemType::LineComment | JsonItemType::BlockComment
                )
            })
            .map(|(i, _)| i)
            .unwrap_or(0)
    }

    fn add_to_buffer(&self, buffer: &mut String, text: &str, length: usize, suffix: &str) {
        if length > 0 {
            buffer.push_str(text);
            buffer.push_str(suffix);
        }
    }

    fn add_to_buffer_fixed(
        &self,
        buffer: &mut String,
        text: &str,
        actual_length: usize,
        target_length: usize,
        suffix: &str,
        suffix_before_padding: bool,
    ) {
        if target_length == 0 {
            return;
        }
        buffer.push_str(text);
        if suffix_before_padding {
            buffer.push_str(suffix);
            self.add_spaces(buffer, target_length.saturating_sub(actual_length));
        } else {
            self.add_spaces(buffer, target_length.saturating_sub(actual_length));
            buffer.push_str(suffix);
        }
    }

    fn add_spaces(&self, buffer: &mut String, count: usize) {
        for _ in 0..count {
            buffer.push(' ');
        }
    }
}
