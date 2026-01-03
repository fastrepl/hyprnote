/// Specifies the line break style for the formatted JSON output.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EolStyle {
    /// Use the system default line ending (CRLF on Windows, LF elsewhere)
    #[default]
    Default,
    /// Use CRLF (\r\n) line endings
    Crlf,
    /// Use LF (\n) line endings
    Lf,
}

/// Determines how the formatter should treat comments.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum CommentPolicy {
    /// Treat comments as errors (default, since JSON standard doesn't allow comments)
    #[default]
    TreatAsError,
    /// Preserve comments in the output
    Preserve,
    /// Remove comments from the output
    Remove,
}

/// Controls alignment of numbers in table columns or compact multiline arrays.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum NumberListAlignment {
    /// Left-align numbers
    Left,
    /// Right-align numbers
    Right,
    /// Align numbers by decimal point
    #[default]
    Decimal,
    /// Normalize numbers to have the same decimal precision
    Normalize,
}

/// Determines where commas are placed in table-formatted rows.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum TableCommaPlacement {
    /// Place commas directly after each element, before padding spaces
    BeforePadding,
    /// Place commas after padding spaces, lined up in their own column
    AfterPadding,
    /// Place commas before padding for most types, but after padding for numbers
    #[default]
    BeforePaddingExceptNumbers,
}

/// Settings controlling the output of FracturedJson-formatted JSON documents.
#[derive(Debug, Clone)]
pub struct FracturedJsonOptions {
    /// Specifies the line break style for the formatted JSON output.
    pub json_eol_style: EolStyle,

    /// Maximum length (in characters, including indentation) when more than one simple value is put on a line.
    pub max_total_line_length: usize,

    /// Maximum nesting level of arrays/objects that may be written on a single line.
    /// 0 disables inlining. 1 allows inlining of arrays/objects that contain only simple items.
    pub max_inline_complexity: i32,

    /// Maximum nesting level for arrays formatted with multiple items per row across multiple lines.
    /// Set to -1 to disable this format.
    pub max_compact_array_complexity: i32,

    /// Maximum nesting level of the rows of an array or object formatted as a table.
    /// Set to -1 to disable this feature.
    pub max_table_row_complexity: i32,

    /// Maximum length difference between property names in an object to align them vertically.
    pub max_prop_name_padding: usize,

    /// If true, colons in aligned object properties are placed right after the property name.
    pub colon_before_prop_name_padding: bool,

    /// Determines whether commas in table-formatted rows are lined up in their own column.
    pub table_comma_placement: TableCommaPlacement,

    /// Minimum items per row to format an array with multiple items per line.
    pub min_compact_array_row_items: usize,

    /// Depth at which lists/objects are always fully expanded, regardless of other settings.
    /// -1 = none; 0 = root node only; 1 = root node and its children.
    pub always_expand_depth: i32,

    /// If true, spaces are included inside brackets for nested arrays/objects.
    pub nested_bracket_padding: bool,

    /// If true, spaces are included inside brackets for simple arrays/objects.
    pub simple_bracket_padding: bool,

    /// If true, includes a space after property colons.
    pub colon_padding: bool,

    /// If true, includes a space after commas.
    pub comma_padding: bool,

    /// If true, spaces are included between JSON data and comments.
    pub comment_padding: bool,

    /// Controls alignment of numbers in table columns or compact multiline arrays.
    pub number_list_alignment: NumberListAlignment,

    /// Number of spaces to use per indent level.
    pub indent_spaces: usize,

    /// Uses a single tab per indent level, instead of spaces.
    pub use_tab_to_indent: bool,

    /// String attached to the beginning of every line, before regular indentation.
    pub prefix_string: String,

    /// Determines how the parser and formatter should treat comments.
    pub comment_policy: CommentPolicy,

    /// If true, blank lines in the original input should be preserved in the output.
    pub preserve_blank_lines: bool,

    /// If true, allows a comma after the last element in arrays or objects.
    pub allow_trailing_commas: bool,
}

impl Default for FracturedJsonOptions {
    fn default() -> Self {
        Self {
            json_eol_style: EolStyle::Default,
            max_total_line_length: 120,
            max_inline_complexity: 2,
            max_compact_array_complexity: 2,
            max_table_row_complexity: 2,
            max_prop_name_padding: 16,
            colon_before_prop_name_padding: false,
            table_comma_placement: TableCommaPlacement::BeforePaddingExceptNumbers,
            min_compact_array_row_items: 3,
            always_expand_depth: -1,
            nested_bracket_padding: true,
            simple_bracket_padding: false,
            colon_padding: true,
            comma_padding: true,
            comment_padding: true,
            number_list_alignment: NumberListAlignment::Decimal,
            indent_spaces: 4,
            use_tab_to_indent: false,
            prefix_string: String::new(),
            comment_policy: CommentPolicy::TreatAsError,
            preserve_blank_lines: false,
            allow_trailing_commas: false,
        }
    }
}

impl FracturedJsonOptions {
    /// Creates a new FracturedJsonOptions with recommended settings.
    pub fn recommended() -> Self {
        Self::default()
    }

    /// Returns the end-of-line string based on the configured style.
    pub fn eol_str(&self) -> &'static str {
        match self.json_eol_style {
            EolStyle::Crlf => "\r\n",
            EolStyle::Lf => "\n",
            EolStyle::Default => {
                #[cfg(windows)]
                {
                    "\r\n"
                }
                #[cfg(not(windows))]
                {
                    "\n"
                }
            }
        }
    }
}
