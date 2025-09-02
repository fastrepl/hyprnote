use nom::{
    bytes::streaming::{tag, take_until},
    character::streaming::multispace0,
    IResult, Parser,
};

#[derive(Debug, Clone)]
pub enum ToolCallEvent {
    ToolStart {
        id: String,
        name: String,
    },
    ArgumentChunk {
        id: String,
        content: String,
    },
    ToolEnd {
        id: String,
    },
    Complete {
        id: String,
        name: String,
        arguments: String,
    },
}

pub trait ToolCallParser: Send + Sync {
    fn parse<'a>(&self, input: &'a str) -> IResult<&'a str, Vec<ToolCallEvent>>;
}

pub struct XmlStyleParser;

impl ToolCallParser for XmlStyleParser {
    fn parse<'a>(&self, input: &'a str) -> IResult<&'a str, Vec<ToolCallEvent>> {
        let mut events = Vec::new();

        let (input, _) = tag("<tool_call>").parse(input)?;
        let (input, _) = multispace0.parse(input)?;

        // Parse JSON content
        let (input, json_content) = take_until("</tool_call>").parse(input)?;

        // Parse closing tag
        let (input, _) = tag("</tool_call>").parse(input)?;

        // Parse JSON to extract name and arguments
        let json_trimmed = json_content.trim();
        let parsed: serde_json::Value = serde_json::from_str(json_trimmed).map_err(|_| {
            nom::Err::Error(nom::error::Error::new(input, nom::error::ErrorKind::Tag))
        })?;

        let id = uuid::Uuid::new_v4().to_string();

        let name = parsed["name"]
            .as_str()
            .ok_or_else(|| {
                nom::Err::Error(nom::error::Error::new(input, nom::error::ErrorKind::Tag))
            })?
            .to_string();

        let arguments = parsed["arguments"].to_string();

        events.push(ToolCallEvent::ToolStart {
            id: id.clone(),
            name: name.clone(),
        });

        events.push(ToolCallEvent::ArgumentChunk {
            id: id.clone(),
            content: arguments.clone(),
        });

        events.push(ToolCallEvent::ToolEnd { id: id.clone() });

        Ok((input, events))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xml_style_parser_complete() {
        let parser = XmlStyleParser;
        let input = r#"<tool_call>
{"name": "get_temperature", "arguments": {"location": "San Francisco"}}
</tool_call>remaining"#;

        let result = parser.parse(input);
        assert!(result.is_ok());

        let (remaining, events) = result.unwrap();
        assert_eq!(remaining, "remaining");
        assert_eq!(events.len(), 3); // ToolStart, ArgumentChunk, ToolEnd

        match &events[0] {
            ToolCallEvent::ToolStart { name, .. } => {
                assert_eq!(name, "get_temperature");
            }
            _ => panic!("Expected ToolStart"),
        }

        match &events[1] {
            ToolCallEvent::ArgumentChunk { content, .. } => {
                let args: serde_json::Value = serde_json::from_str(content).unwrap();
                assert_eq!(args["location"], "San Francisco");
            }
            _ => panic!("Expected ArgumentChunk"),
        }

        match &events[2] {
            ToolCallEvent::ToolEnd { .. } => {}
            _ => panic!("Expected ToolEnd"),
        }
    }

    #[test]
    fn test_xml_style_parser_incomplete() {
        let parser = XmlStyleParser;
        let input = "<tool_call>\n{\"name\": \"get_temp";

        let result = parser.parse(input);
        assert!(matches!(result, Err(nom::Err::Incomplete(_))));
    }

    #[test]
    fn test_xml_style_parser_simple_function() {
        let parser = XmlStyleParser;
        let input = r#"<tool_call>
{"name": "greet", "arguments": {"text": "Hello!"}}
</tool_call>"#;

        let result = parser.parse(input);
        assert!(result.is_ok());

        let (remaining, events) = result.unwrap();
        assert_eq!(remaining, "");
        assert_eq!(events.len(), 3);

        match &events[0] {
            ToolCallEvent::ToolStart { name, .. } => {
                assert_eq!(name, "greet");
            }
            _ => panic!("Expected ToolStart"),
        }

        match &events[1] {
            ToolCallEvent::ArgumentChunk { content, .. } => {
                let args: serde_json::Value = serde_json::from_str(content).unwrap();
                assert_eq!(args["text"], "Hello!");
            }
            _ => panic!("Expected ArgumentChunk"),
        }
    }
}
