use apple_note::{EmbeddedObjectType, extract_embedded_objects, parse_note_store_proto};
use std::fs;

#[test]
fn test_embedded_object_type_detection() {
    // Test various UTI type mappings
    assert_eq!(
        EmbeddedObjectType::from_uti("com.apple.notes.table"),
        EmbeddedObjectType::Table
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("com.apple.notes.ICTable"),
        EmbeddedObjectType::Table
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("public.image"),
        EmbeddedObjectType::Image
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("com.apple.drawing.2"),
        EmbeddedObjectType::Drawing
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("public.url"),
        EmbeddedObjectType::URL
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("public.audio"),
        EmbeddedObjectType::Audio
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("public.movie"),
        EmbeddedObjectType::Video
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("com.adobe.pdf"),
        EmbeddedObjectType::PDF
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("unknown.type"),
        EmbeddedObjectType::Unknown
    );
}

#[test]
fn test_embedded_object_type_detection_partial_match() {
    // Test partial matching for image, video, audio, pdf
    assert_eq!(
        EmbeddedObjectType::from_uti("public.jpeg.image"),
        EmbeddedObjectType::Image
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("public.mpeg4.video"),
        EmbeddedObjectType::Video
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("public.mp3.audio"),
        EmbeddedObjectType::Audio
    );
    assert_eq!(
        EmbeddedObjectType::from_uti("public.pdf.document"),
        EmbeddedObjectType::PDF
    );
}

#[test]
fn test_extract_embedded_objects_from_note() {
    // Create a simple note with attachment info in attribute runs
    // We'll use a real test file if available, otherwise just test the logic
    use apple_note::proto::{AttachmentInfo, AttributeRun, Note};

    let mut note = Note {
        note_text: "Test text with attachment\u{FFFC}".to_string(),
        attribute_run: vec![],
    };

    // Add an attribute run without attachment
    note.attribute_run.push(AttributeRun {
        length: 25,
        paragraph_style: None,
        font: None,
        font_weight: None,
        underlined: None,
        strikethrough: None,
        superscript: None,
        link: None,
        color: None,
        attachment_info: None,
        unknown_identifier: None,
        emphasis_style: None,
    });

    // Add an attribute run with a table attachment
    note.attribute_run.push(AttributeRun {
        length: 1,
        paragraph_style: None,
        font: None,
        font_weight: None,
        underlined: None,
        strikethrough: None,
        superscript: None,
        link: None,
        color: None,
        attachment_info: Some(AttachmentInfo {
            attachment_identifier: Some("test-uuid-123".to_string()),
            type_uti: Some("com.apple.notes.table".to_string()),
        }),
        unknown_identifier: None,
        emphasis_style: None,
    });

    let objects = extract_embedded_objects(&note);

    assert_eq!(objects.len(), 1);
    assert_eq!(objects[0].object_type, EmbeddedObjectType::Table);
    assert_eq!(objects[0].uuid, "test-uuid-123");
    assert_eq!(objects[0].type_uti, "com.apple.notes.table");
}

#[test]
fn test_extract_multiple_embedded_objects() {
    use apple_note::proto::{AttachmentInfo, AttributeRun, Note};

    let mut note = Note {
        note_text: "Text\u{FFFC}more text\u{FFFC}".to_string(),
        attribute_run: vec![],
    };

    // Add text run
    note.attribute_run.push(AttributeRun {
        length: 4,
        paragraph_style: None,
        font: None,
        font_weight: None,
        underlined: None,
        strikethrough: None,
        superscript: None,
        link: None,
        color: None,
        attachment_info: None,
        unknown_identifier: None,
        emphasis_style: None,
    });

    // Add table attachment
    note.attribute_run.push(AttributeRun {
        length: 1,
        paragraph_style: None,
        font: None,
        font_weight: None,
        underlined: None,
        strikethrough: None,
        superscript: None,
        link: None,
        color: None,
        attachment_info: Some(AttachmentInfo {
            attachment_identifier: Some("table-uuid".to_string()),
            type_uti: Some("com.apple.notes.table".to_string()),
        }),
        unknown_identifier: None,
        emphasis_style: None,
    });

    // Add more text
    note.attribute_run.push(AttributeRun {
        length: 9,
        paragraph_style: None,
        font: None,
        font_weight: None,
        underlined: None,
        strikethrough: None,
        superscript: None,
        link: None,
        color: None,
        attachment_info: None,
        unknown_identifier: None,
        emphasis_style: None,
    });

    // Add image attachment
    note.attribute_run.push(AttributeRun {
        length: 1,
        paragraph_style: None,
        font: None,
        font_weight: None,
        underlined: None,
        strikethrough: None,
        superscript: None,
        link: None,
        color: None,
        attachment_info: Some(AttachmentInfo {
            attachment_identifier: Some("image-uuid".to_string()),
            type_uti: Some("public.image".to_string()),
        }),
        unknown_identifier: None,
        emphasis_style: None,
    });

    let objects = extract_embedded_objects(&note);

    assert_eq!(objects.len(), 2);
    assert_eq!(objects[0].object_type, EmbeddedObjectType::Table);
    assert_eq!(objects[0].uuid, "table-uuid");
    assert_eq!(objects[1].object_type, EmbeddedObjectType::Image);
    assert_eq!(objects[1].uuid, "image-uuid");
}
