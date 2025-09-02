use nom::{
    bytes::complete::{tag, take_until},
    character::complete::multispace0,
    combinator::map,
    sequence::{delimited, terminated},
    IResult, Parser,
};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Response {
    TextDelta(String),
    Reasoning(String),
    ToolCall {
        name: String,
        arguments: HashMap<String, serde_json::Value>,
    },
}

pub struct StreamingParser {
    buffer: String,
}

impl StreamingParser {
    pub fn new() -> Self {
        Self {
            buffer: String::new(),
        }
    }

    pub fn process_chunk(&mut self, chunk: &str) -> Vec<Response> {
        self.buffer.push_str(chunk);
        let mut responses = Vec::new();

        loop {
            match self.try_parse_next() {
                Some(response) => responses.push(response),
                None => break,
            }
        }

        if !self.buffer.is_empty() && !self.looks_like_block_start() {
            let text = self.buffer.clone();
            self.buffer.clear();
            if !text.trim().is_empty() {
                responses.push(Response::TextDelta(text));
            }
        }

        responses
    }

    fn try_parse_next(&mut self) -> Option<Response> {
        if let Ok((remaining, content)) = parse_think_block(&self.buffer) {
            self.buffer = remaining.to_string();
            return Some(Response::Reasoning(content));
        }

        if let Ok((remaining, (name, arguments))) = parse_tool_call_block(&self.buffer) {
            let arguments: HashMap<String, serde_json::Value> =
                serde_json::from_str(&arguments).unwrap_or_default();

            self.buffer = remaining.to_string();
            return Some(Response::ToolCall { name, arguments });
        }

        if let Some(pos) = self.find_next_block_start() {
            if pos > 0 {
                let text = self.buffer[..pos].to_string();
                self.buffer = self.buffer[pos..].to_string();
                if !text.trim().is_empty() {
                    return Some(Response::TextDelta(text));
                }
            }
        }

        None
    }

    fn looks_like_block_start(&self) -> bool {
        self.buffer.trim_start().starts_with("<think>")
            || self.buffer.trim_start().starts_with("<tool_call>")
    }

    fn find_next_block_start(&self) -> Option<usize> {
        let think_pos = self.buffer.find("<think>");
        let tool_pos = self.buffer.find("<tool_call>");

        match (think_pos, tool_pos) {
            (Some(t), Some(tc)) => Some(t.min(tc)),
            (Some(t), None) => Some(t),
            (None, Some(tc)) => Some(tc),
            (None, None) => None,
        }
    }
}

fn parse_think_block(input: &str) -> IResult<&str, String> {
    let mut parser = map(
        terminated(
            delimited(tag("<think>"), take_until("</think>"), tag("</think>")),
            multispace0,
        ),
        |content: &str| content.trim().to_string(),
    );
    parser.parse(input)
}

fn parse_tool_call_block(input: &str) -> IResult<&str, (String, String)> {
    let (input, _) = tag("<tool_call>")(input)?;
    let (input, _) = multispace0(input)?;
    let (input, json_content) = take_until("</tool_call>")(input)?;
    let (input, _) = tag("</tool_call>")(input)?;
    let (input, _) = multispace0(input)?;

    let json_trimmed = json_content.trim();
    let parsed: serde_json::Value = serde_json::from_str(json_trimmed)
        .map_err(|_| nom::Err::Error(nom::error::Error::new(input, nom::error::ErrorKind::Tag)))?;

    let name = parsed["name"]
        .as_str()
        .ok_or_else(|| nom::Err::Error(nom::error::Error::new(input, nom::error::ErrorKind::Tag)))?
        .to_string();

    let arguments = parsed["arguments"].to_string();

    Ok((input, (name, arguments)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_text() {
        let mut parser = StreamingParser::new();

        let items = {
            let mut items = vec![];
            items.extend(parser.process_chunk("Hello, "));
            items.extend(parser.process_chunk("world!"));
            items
        };

        assert_eq!(
            items,
            vec![
                Response::TextDelta("Hello, ".to_string()),
                Response::TextDelta("world!".to_string())
            ]
        );
    }

    #[test]
    fn test_thinking_block() {
        let mut parser = StreamingParser::new();

        let items = {
            let mut items = vec![];
            items.extend(parser.process_chunk("<think>\nI need to "));
            items.extend(parser.process_chunk("process this request.\n"));
            items.extend(parser.process_chunk("</think>\nHere's my "));
            items.extend(parser.process_chunk("response."));
            items
        };

        assert_eq!(
            items,
            [
                Response::Reasoning("I need to process this request.".to_string()),
                Response::TextDelta("Here's my ".to_string()),
                Response::TextDelta("response.".to_string())
            ]
        );
    }

    #[test]
    fn test_simple_tool_call() {
        let mut parser = StreamingParser::new();

        let items = {
            let mut items = vec![];
            items.extend(parser.process_chunk("<tool_call>\n"));
            items.extend(parser.process_chunk(r#"{"name": "greet", "#));
            items.extend(parser.process_chunk(r#""arguments": {"text": "#));
            items.extend(parser.process_chunk(r#""Hello!"}}"#));
            items.extend(parser.process_chunk("\n</tool_call>"));
            items
        };

        assert_eq!(
            items,
            vec![Response::ToolCall {
                name: "greet".to_string(),
                arguments: HashMap::from([(
                    "text".to_string(),
                    serde_json::Value::String("Hello!".to_string())
                )])
            }]
        );
    }

    #[test]
    fn test_tool_call_after_thinking() {
        let mut parser = StreamingParser::new();

        let items = {
            let mut items = vec![];
            items.extend(parser.process_chunk("<think>\nI need to "));
            items.extend(parser.process_chunk("process this request.\n"));
            items.extend(parser.process_chunk("</think>\n"));
            items.extend(parser.process_chunk("<tool_call>\n"));
            items.extend(parser.process_chunk(r#"{"name": "greet", "#));
            items.extend(parser.process_chunk(r#""arguments": {"text": "#));
            items.extend(parser.process_chunk(r#""Hello!"}}"#));
            items.extend(parser.process_chunk("\n</tool_call>"));
            items
        };

        assert_eq!(
            items,
            [
                Response::Reasoning("I need to process this request.".to_string()),
                Response::ToolCall {
                    name: "greet".to_string(),
                    arguments: HashMap::from([(
                        "text".to_string(),
                        serde_json::Value::String("Hello!".to_string())
                    )])
                }
            ]
        );
    }
}
