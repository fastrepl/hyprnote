use apple_note::{note_to_markdown, parse_note_store_proto};
use std::fs;

#[test]
fn test_simple_note_parsing() {
    let data =
        fs::read("tests/data/simple_note_protobuf_gzipped.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    assert!(proto.document.version >= 0);
    assert!(!proto.document.note.note_text.is_empty());
}

#[test]
fn test_simple_note_parsing_uncompressed() {
    let data = fs::read("tests/data/simple_note_protobuf.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    assert!(proto.document.version >= 0);
    assert!(!proto.document.note.note_text.is_empty());
}

#[test]
fn test_text_decorations() {
    let data =
        fs::read("tests/data/text_decorations_gzipped.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    // The note should have text and attribute runs
    assert!(!proto.document.note.note_text.is_empty());
    assert!(!proto.document.note.attribute_run.is_empty());

    // Convert to markdown to verify formatting
    let markdown = note_to_markdown(&proto.document.note);
    assert!(!markdown.is_empty());
}

#[test]
fn test_block_quotes() {
    let data = fs::read("tests/data/block_quotes_gzipped.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    assert!(!proto.document.note.note_text.is_empty());

    // Convert to markdown - should contain block quote markers
    let markdown = note_to_markdown(&proto.document.note);
    assert!(markdown.contains('>'));
}

#[test]
fn test_list_indents() {
    let data = fs::read("tests/data/list_indents_gzipped.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    assert!(!proto.document.note.note_text.is_empty());
    assert!(!proto.document.note.attribute_run.is_empty());

    // Check that some attribute runs have indent amounts
    let has_indents = proto.document.note.attribute_run.iter().any(|run| {
        run.paragraph_style
            .as_ref()
            .and_then(|ps| ps.indent_amount)
            .is_some()
    });
    assert!(has_indents);
}

#[test]
fn test_url_formatting() {
    let data = fs::read("tests/data/url_gzipped.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    assert!(!proto.document.note.note_text.is_empty());

    // Check that some attribute runs have links
    let has_links = proto
        .document
        .note
        .attribute_run
        .iter()
        .any(|run| run.link.is_some());
    assert!(has_links);

    // Convert to markdown - should contain markdown links
    let markdown = note_to_markdown(&proto.document.note);
    assert!(markdown.contains("]("));
}

#[test]
fn test_color_formatting() {
    let data =
        fs::read("tests/data/color_formatting_gzipped.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    assert!(!proto.document.note.note_text.is_empty());

    // Check that some attribute runs have colors
    let has_colors = proto
        .document
        .note
        .attribute_run
        .iter()
        .any(|run| run.color.is_some());
    assert!(has_colors);
}

#[test]
fn test_emoji_formatting() {
    let data =
        fs::read("tests/data/emoji_formatting_1_gzipped.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    assert!(!proto.document.note.note_text.is_empty());

    // Emojis should be preserved in the text
    // Check that we can parse the note successfully
    let markdown = note_to_markdown(&proto.document.note);
    assert!(!markdown.is_empty());
}

#[test]
fn test_wide_characters() {
    let data =
        fs::read("tests/data/wide_characters_gzipped.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    assert!(!proto.document.note.note_text.is_empty());

    // Wide characters should be preserved
    let markdown = note_to_markdown(&proto.document.note);
    assert!(!markdown.is_empty());
}

#[test]
fn test_html_content() {
    let data = fs::read("tests/data/html_gzipped.bin").expect("Failed to read test data");
    let proto = parse_note_store_proto(&data).expect("Failed to parse proto");

    assert!(!proto.document.note.note_text.is_empty());

    // Should successfully parse notes with HTML-like content
    let markdown = note_to_markdown(&proto.document.note);
    assert!(!markdown.is_empty());
}
