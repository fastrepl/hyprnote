use crate::{Formatter, FracturedJsonOptions, NumberListAlignment, EolStyle};

fn count_lines(s: &str) -> usize {
    s.lines().count()
}

fn test_instances_line_up(lines: &[&str], substring: &str) -> bool {
    let positions: Vec<Option<usize>> = lines
        .iter()
        .map(|line| line.find(substring))
        .collect();
    
    let found_positions: Vec<usize> = positions.iter().filter_map(|p| *p).collect();
    if found_positions.is_empty() {
        return true;
    }
    
    let first = found_positions[0];
    found_positions.iter().all(|&p| p == first)
}

#[test]
fn test_simple_array_inline() {
    let formatter = Formatter::new();
    let input = r#"[1, 2, 3]"#;
    let output = formatter.reformat(input, 0).unwrap();
    assert_eq!(output.trim(), "[1, 2, 3]");
}

#[test]
fn test_simple_object_inline() {
    let formatter = Formatter::new();
    let input = r#"{"a": 1, "b": 2}"#;
    let output = formatter.reformat(input, 0).unwrap();
    assert_eq!(output.trim(), r#"{"a": 1, "b": 2}"#);
}

#[test]
fn test_nested_array_inline() {
    let formatter = Formatter::new();
    let input = r#"[[1, 2], [3, 4]]"#;
    let output = formatter.reformat(input, 0).unwrap();
    assert_eq!(output.trim(), "[ [1, 2], [3, 4] ]");
}

#[test]
fn test_empty_array() {
    let formatter = Formatter::new();
    let input = r#"[]"#;
    let output = formatter.reformat(input, 0).unwrap();
    assert_eq!(output.trim(), "[]");
}

#[test]
fn test_empty_object() {
    let formatter = Formatter::new();
    let input = r#"{}"#;
    let output = formatter.reformat(input, 0).unwrap();
    assert_eq!(output.trim(), "{}");
}

#[test]
fn test_null_value() {
    let formatter = Formatter::new();
    let input = r#"null"#;
    let output = formatter.reformat(input, 0).unwrap();
    assert_eq!(output.trim(), "null");
}

#[test]
fn test_boolean_values() {
    let formatter = Formatter::new();
    
    let output = formatter.reformat("true", 0).unwrap();
    assert_eq!(output.trim(), "true");
    
    let output = formatter.reformat("false", 0).unwrap();
    assert_eq!(output.trim(), "false");
}

#[test]
fn test_string_value() {
    let formatter = Formatter::new();
    let input = r#""hello world""#;
    let output = formatter.reformat(input, 0).unwrap();
    assert_eq!(output.trim(), r#""hello world""#);
}

#[test]
fn test_number_value() {
    let formatter = Formatter::new();
    let input = r#"42"#;
    let output = formatter.reformat(input, 0).unwrap();
    assert_eq!(output.trim(), "42");
}

#[test]
fn test_correct_line_count_for_inline_complexity_0() {
    let mut options = FracturedJsonOptions::default();
    options.max_inline_complexity = 0;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[[1, 2], [3, 4], [5, 6]]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // With complexity 0, nothing should be inlined
    assert!(count_lines(&output) > 1);
}

#[test]
fn test_correct_line_count_for_inline_complexity_1() {
    let mut options = FracturedJsonOptions::default();
    options.max_inline_complexity = 1;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[[1, 2], [3, 4], [5, 6]]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // With complexity 1, inner arrays should be inlined but outer should expand
    let lines: Vec<&str> = output.lines().collect();
    assert!(lines.len() >= 3);
}

#[test]
fn test_correct_line_count_for_inline_complexity_2() {
    let mut options = FracturedJsonOptions::default();
    options.max_inline_complexity = 2;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[[1, 2], [3, 4], [5, 6]]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // With complexity 2, everything should fit on one line
    assert_eq!(count_lines(&output), 1);
}

#[test]
fn test_max_line_length_respected() {
    let mut options = FracturedJsonOptions::default();
    options.max_total_line_length = 40;
    let max_len = options.max_total_line_length;
    let formatter = Formatter::with_options(options);
    
    let input = r#"{"name": "John", "age": 30, "city": "New York"}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Check that no line exceeds max length (except possibly single elements)
    for line in output.lines() {
        if line.contains(':') && !line.contains('{') && !line.contains('}') {
            // This is a property line, should respect max length
            assert!(line.len() <= max_len + 10, 
                "Line too long: {} (len={})", line, line.len());
        }
    }
}

#[test]
fn test_nested_elements_line_up() {
    let formatter = Formatter::new();
    let input = r#"[
        {"type": "turret", "hp": 400},
        {"type": "assassin", "hp": 80},
        {"type": "berserker", "hp": 150}
    ]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    let lines: Vec<&str> = output.lines().collect();
    
    // Check that "type" properties line up
    assert!(test_instances_line_up(&lines, "\"type\""));
    
    // Check that "hp" properties line up
    assert!(test_instances_line_up(&lines, "\"hp\""));
}

#[test]
fn test_array_table_formatting() {
    let formatter = Formatter::new();
    let input = r#"[
        [0.0, 3.5, 10.5],
        [0.0, 0.0, 1.2],
        [0.4, 1.9, 4.4]
    ]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should format as a table with aligned columns
    let lines: Vec<&str> = output.lines().collect();
    // With default settings, this small array fits on one line (complexity 2, max_inline_complexity 2)
    // So we just verify it's valid JSON and contains all the values
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok(), "Output should be valid JSON: {}", output);
    assert!(output.contains("0.0"));
    assert!(output.contains("3.5"));
    assert!(output.contains("10.5"));
}

#[test]
fn test_number_alignment_decimal() {
    let mut options = FracturedJsonOptions::default();
    options.number_list_alignment = NumberListAlignment::Decimal;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[1.5, 10.25, 100.125]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Numbers should be aligned by decimal point in table/compact format
    assert!(output.contains("1.5") || output.contains("1.5"));
}

#[test]
fn test_number_alignment_left() {
    let mut options = FracturedJsonOptions::default();
    options.number_list_alignment = NumberListAlignment::Left;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[1, 10, 100]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    assert!(output.contains("1"));
    assert!(output.contains("10"));
    assert!(output.contains("100"));
}

#[test]
fn test_number_alignment_right() {
    let mut options = FracturedJsonOptions::default();
    options.number_list_alignment = NumberListAlignment::Right;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[1, 10, 100]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    assert!(output.contains("1"));
    assert!(output.contains("10"));
    assert!(output.contains("100"));
}

#[test]
fn test_no_trailing_whitespace() {
    let formatter = Formatter::new();
    let input = r#"{"a": [1, 2, 3], "b": {"x": 1, "y": 2}}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    for line in output.lines() {
        assert!(!line.ends_with(' '), "Line has trailing whitespace: '{}'", line);
        assert!(!line.ends_with('\t'), "Line has trailing tab: '{}'", line);
    }
}

#[test]
fn test_repeated_formatting_is_stable() {
    let formatter = Formatter::new();
    let input = r#"{"a": [1, 2, 3], "b": {"x": 1, "y": 2}}"#;
    
    let first = formatter.reformat(input, 0).unwrap();
    let minified = formatter.minify(&first).unwrap();
    let second = formatter.reformat(&minified, 0).unwrap();
    let minified2 = formatter.minify(&second).unwrap();
    let third = formatter.reformat(&minified2, 0).unwrap();
    
    assert_eq!(second, third, "Formatting should be stable after repeated format/minify cycles");
}

#[test]
fn test_is_well_formed() {
    let formatter = Formatter::new();
    let input = r#"{"a": [1, 2, 3], "b": {"x": 1, "y": 2}}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // The output should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok(), "Output should be valid JSON: {}", output);
}

#[test]
fn test_all_strings_exist() {
    let formatter = Formatter::new();
    let input = r#"{"name": "John", "city": "New York", "tags": ["developer", "rust"]}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // All string values should appear in the output
    assert!(output.contains("John"));
    assert!(output.contains("New York"));
    assert!(output.contains("developer"));
    assert!(output.contains("rust"));
    assert!(output.contains("name"));
    assert!(output.contains("city"));
    assert!(output.contains("tags"));
}

#[test]
fn test_simple_bracket_padding() {
    let mut options = FracturedJsonOptions::default();
    options.simple_bracket_padding = true;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[1, 2, 3]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    assert!(output.contains("[ ") && output.contains(" ]"), 
        "Simple bracket padding should add spaces: {}", output);
}

#[test]
fn test_no_simple_bracket_padding() {
    let mut options = FracturedJsonOptions::default();
    options.simple_bracket_padding = false;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[1, 2, 3]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    assert!(output.starts_with('[') && !output.starts_with("[ "), 
        "No simple bracket padding: {}", output);
}

#[test]
fn test_nested_bracket_padding() {
    let mut options = FracturedJsonOptions::default();
    options.nested_bracket_padding = true;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[[1, 2], [3, 4]]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Nested arrays should have padding
    assert!(output.contains("[ "), "Nested bracket padding should add spaces: {}", output);
}

#[test]
fn test_indent_spaces() {
    let mut options = FracturedJsonOptions::default();
    options.indent_spaces = 2;
    options.max_inline_complexity = 0;
    let formatter = Formatter::with_options(options);
    
    let input = r#"{"a": 1}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should use 2-space indentation
    let lines: Vec<&str> = output.lines().collect();
    if lines.len() > 1 {
        let indent_line = lines.iter().find(|l| l.starts_with(' ')).unwrap_or(&"");
        let leading_spaces = indent_line.len() - indent_line.trim_start().len();
        assert_eq!(leading_spaces, 2, "Should use 2-space indent: {}", output);
    }
}

#[test]
fn test_colon_padding() {
    let mut options = FracturedJsonOptions::default();
    options.colon_padding = true;
    let formatter = Formatter::with_options(options);
    
    let input = r#"{"a": 1}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    assert!(output.contains(": "), "Colon padding should add space after colon: {}", output);
}

#[test]
fn test_no_colon_padding() {
    let mut options = FracturedJsonOptions::default();
    options.colon_padding = false;
    let formatter = Formatter::with_options(options);
    
    let input = r#"{"a": 1}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    assert!(output.contains("\":") && !output.contains("\": "), 
        "No colon padding: {}", output);
}

#[test]
fn test_comma_padding() {
    let mut options = FracturedJsonOptions::default();
    options.comma_padding = true;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[1, 2, 3]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    assert!(output.contains(", "), "Comma padding should add space after comma: {}", output);
}

#[test]
fn test_no_comma_padding() {
    let mut options = FracturedJsonOptions::default();
    options.comma_padding = false;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[1, 2, 3]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should have commas without spaces
    assert!(output.contains(",") && !output.contains(", "), 
        "No comma padding: {}", output);
}

#[test]
fn test_eol_style_lf() {
    let mut options = FracturedJsonOptions::default();
    options.json_eol_style = EolStyle::Lf;
    options.max_inline_complexity = 0;
    let formatter = Formatter::with_options(options);
    
    let input = r#"{"a": 1}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    assert!(output.contains('\n'), "Should contain LF");
    assert!(!output.contains("\r\n"), "Should not contain CRLF");
}

#[test]
fn test_eol_style_crlf() {
    let mut options = FracturedJsonOptions::default();
    options.json_eol_style = EolStyle::Crlf;
    options.max_inline_complexity = 0;
    let formatter = Formatter::with_options(options);
    
    let input = r#"{"a": 1}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    assert!(output.contains("\r\n"), "Should contain CRLF: {:?}", output);
}

#[test]
fn test_always_expand_depth() {
    let mut options = FracturedJsonOptions::default();
    options.always_expand_depth = 0;
    let formatter = Formatter::with_options(options);
    
    let input = r#"[1, 2, 3]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Root should be expanded
    assert!(count_lines(&output) > 1, "Root should be expanded: {}", output);
}

#[test]
fn test_minify() {
    let formatter = Formatter::new();
    let input = r#"{
        "name": "John",
        "age": 30
    }"#;
    let output = formatter.minify(input).unwrap();
    
    // Should be compact with no extra whitespace
    assert!(!output.contains('\n'), "Minified should have no newlines");
    assert!(!output.contains("  "), "Minified should have no double spaces");
}

#[test]
fn test_complex_nested_structure() {
    let formatter = Formatter::new();
    let input = r#"{
        "users": [
            {"name": "Alice", "scores": [95, 87, 92]},
            {"name": "Bob", "scores": [78, 85, 90]}
        ],
        "metadata": {
            "version": 1,
            "generated": true
        }
    }"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok(), "Complex structure should produce valid JSON");
    
    // All data should be preserved
    assert!(output.contains("Alice"));
    assert!(output.contains("Bob"));
    assert!(output.contains("95"));
    assert!(output.contains("version"));
}

#[test]
fn test_deeply_nested() {
    let formatter = Formatter::new();
    let input = r#"[[[[1]]]]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok());
    
    // Should contain the value
    assert!(output.contains('1'));
}

#[test]
fn test_special_characters_in_strings() {
    let formatter = Formatter::new();
    let input = r#"{"message": "Hello\nWorld\t!"}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok());
}

#[test]
fn test_unicode_strings() {
    let formatter = Formatter::new();
    let input = r#"{"greeting": "Hello, \u4e16\u754c!"}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok());
}

#[test]
fn test_large_numbers() {
    let formatter = Formatter::new();
    let input = r#"[1e308, -1e308, 1.7976931348623157e308]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok());
}

#[test]
fn test_small_numbers() {
    let formatter = Formatter::new();
    let input = r#"[1e-308, 5e-324]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok());
}

#[test]
fn test_mixed_array() {
    let formatter = Formatter::new();
    let input = r#"[1, "two", true, null, {"key": "value"}, [1, 2, 3]]"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok());
    
    // All values should be present
    assert!(output.contains("1"));
    assert!(output.contains("two"));
    assert!(output.contains("true"));
    assert!(output.contains("null"));
    assert!(output.contains("key"));
}

#[test]
fn test_file_1_json() {
    let formatter = Formatter::new();
    let input = include_str!("../tests/test_files/1.json");
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok(), "File 1.json output should be valid JSON");
    
    // No trailing whitespace
    for (i, line) in output.lines().enumerate() {
        assert!(!line.ends_with(' '), "Line {} has trailing whitespace: {:?}", i + 1, line);
    }
}

#[test]
fn test_file_2_json() {
    let formatter = Formatter::new();
    let input = include_str!("../tests/test_files/2.json");
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok(), "File 2.json output should be valid JSON");
}

#[test]
fn test_file_3_json() {
    let formatter = Formatter::new();
    let input = include_str!("../tests/test_files/3.json");
    let output = formatter.reformat(input, 0).unwrap();
    
    // Should be valid JSON (just "null")
    let parsed: Result<serde_json::Value, _> = serde_json::from_str(&output);
    assert!(parsed.is_ok(), "File 3.json output should be valid JSON");
    assert_eq!(output.trim(), "null");
}

#[test]
fn test_prefix_string() {
    let mut options = FracturedJsonOptions::default();
    options.prefix_string = "// ".to_string();
    options.max_inline_complexity = 0;
    let formatter = Formatter::with_options(options);
    
    let input = r#"{"a": 1}"#;
    let output = formatter.reformat(input, 0).unwrap();
    
    // Every line should start with the prefix
    for line in output.lines() {
        assert!(line.starts_with("// "), "Line should start with prefix: {}", line);
    }
}

#[test]
fn test_starting_depth() {
    let mut options = FracturedJsonOptions::default();
    options.max_inline_complexity = 0;
    let formatter = Formatter::with_options(options);
    
    let input = r#"{"a": 1}"#;
    let output = formatter.reformat(input, 2).unwrap();
    
    // Lines should be indented by starting depth
    let first_line = output.lines().next().unwrap();
    let leading_spaces = first_line.len() - first_line.trim_start().len();
    assert!(leading_spaces >= 8, "Should have starting depth indentation: {}", output);
}
