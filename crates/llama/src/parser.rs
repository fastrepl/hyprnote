use nom::{
    bytes::complete::{tag, take_until},
    character::complete::multispace0,
    combinator::map,
    sequence::{delimited, terminated},
    IResult, Parser,
};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
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
        #[cfg(all(debug_assertions, not(test)))]
        debug_log_chunk(chunk);

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

#[cfg(all(debug_assertions, not(test)))]
fn debug_log_chunk(chunk: &str) {
    const FILE_NAME: &str = "./llama_stream_chunks.debug.json";

    let mut arr: Vec<String> = match std::fs::read_to_string(FILE_NAME) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => Vec::new(),
    };
    arr.push(chunk.to_string());

    if let Ok(json) = serde_json::to_string_pretty(&arr) {
        let _ = std::fs::write(FILE_NAME, json);
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
    use Response::*;

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

    #[test]
    fn test_realword_summary() {
        let chunks = vec![
            "#",
            " Meeting",
            " Details",
            "\n",
            "\n",
            "-",
            " ",
            "**",
            "Date",
            " and",
            " Time",
            "**:",
            " Not",
            " explicitly",
            " stated",
            " in",
            " the",
            " transcript",
            ".\n",
            "-",
            " ",
            "**",
            "Attend",
            "ees",
            "**:",
            " Speaker",
            " ",
            "0",
            " (",
            "user",
            ")",
            " is",
            " the",
            " only",
            " participant",
            " mentioned",
            ".\n",
            "-",
            " ",
            "**",
            "Meeting",
            " Purpose",
            "**:",
            " Announcement",
            " about",
            " Hy",
            "pr",
            "note",
            " product",
            " and",
            " its",
            " features",
            ".\n",
            "-",
            " ",
            "**",
            "Location",
            "**:",
            " Apple",
            " Park",
            " (",
            "pres",
            "umably",
            " live",
            " session",
            ").\n\n",
            "#",
            " Agenda",
            "\n\n",
            "-",
            " ",
            "**",
            "Product",
            " Announcement",
            "**:",
            " Presentation",
            " and",
            " demonstration",
            " of",
            " Hy",
            "pr",
            "note",
            ".\n",
            "-",
            " **",
            "User",
            " Experience",
            " Overview",
            "**:",
            " Discussion",
            " on",
            " how",
            " Hy",
            "pr",
            "note",
            " simpl",
            "ifies",
            " note",
            "-taking",
            " during",
            " meetings",
            ".\n",
            "-",
            " **",
            "Product",
            " Different",
            "iation",
            "**:",
            " Highlight",
            "ing",
            " key",
            " features",
            " that",
            " distinguish",
            " Hy",
            "pr",
            "note",
            " from",
            " other",
            " meeting",
            " notes",
            " apps",
            ".\n",
            "-",
            " **",
            "Privacy",
            " and",
            " Security",
            " Em",
            "phasis",
            "**:",
            " Em",
            "phasis",
            " on",
            " data",
            " privacy",
            " and",
            " local",
            "-first",
            " architecture",
            ".\n",
            "-",
            " **",
            "Extension",
            " Support",
            "**:",
            " Availability",
            " of",
            " a",
            " wide",
            " range",
            " of",
            " extensions",
            " for",
            " advanced",
            " users",
            ".\n",
            "\n",
            "#",
            " Discussion",
            " Points",
            "\n\n",
            "-",
            " ",
            "**",
            "Key",
            " Features",
            " of",
            " Hy",
            "pr",
            "note",
            "**",
            ":",
            " Listening",
            " to",
            " conversations",
            " to",
            " capture",
            " key",
            " points",
            " without",
            " needing",
            " to",
            " trans",
            "cribe",
            " everything",
            ".\n",
            "-",
            " **",
            "Note",
            "-taking",
            " Process",
            "**:",
            " Comb",
            "ining",
            " notes",
            " with",
            " transcripts",
            " for",
            " context",
            " and",
            " facilitating",
            " summary",
            " generation",
            ".\n",
            "-",
            " **",
            "Privacy",
            " and",
            " Data",
            " Security",
            "**:",
            " Built",
            "-in",
            " offline",
            " functionality",
            " and",
            " data",
            " stored",
            " on",
            " local",
            " devices",
            ".\n",
            "-",
            " **",
            "User",
            "-C",
            "entric",
            " Design",
            "**:",
            " Designed",
            " for",
            " a",
            " wide",
            " audience",
            " with",
            " simple",
            " use",
            " cases",
            " and",
            " flexibility",
            " for",
            " advanced",
            " users",
            ".\n",
            "-",
            " **",
            "Extension",
            " E",
            "cosystem",
            "**:",
            " Comprehensive",
            " support",
            " for",
            " CRM",
            " integration",
            " and",
            " other",
            " extensions",
            ".\n\n",
            "#",
            " Action",
            " Items",
            "\n\n",
            "-",
            " ",
            "**",
            "Call",
            " Dent",
            "ist",
            "**:",
            " Speaker",
            " ",
            "0",
            "'s",
            " personal",
            " reminder",
            ".\n",
            "-",
            " **",
            "Review",
            " Insurance",
            " Policy",
            "**:",
            " Speaker",
            " ",
            "0",
            "'s",
            " personal",
            " reminder",
            ".\n",
            "-",
            " **",
            "Book",
            " Vacation",
            "**:",
            " Speaker",
            " ",
            "0",
            "'s",
            " personal",
            " reminder",
            ".\n\n",
            "#",
            " Next",
            " Steps",
            "\n\n",
            "-",
            " ",
            "**",
            "Follow",
            "-Up",
            " Actions",
            "**:",
            " Speaker",
            " ",
            "0",
            "'s",
            " personal",
            " reminder",
            ".\n",
            "-",
            " **",
            "Next",
            " Meeting",
            " Details",
            "**:",
            " Not",
            " explicitly",
            " stated",
            " in",
            " the",
            " transcript",
            ".\n",
            "-",
            " **",
            "Product",
            " Promotion",
            "**:",
            " Speaker",
            " ",
            "0",
            "'s",
            " role",
            " as",
            " a",
            " representative",
            " for",
            " Hy",
            "pr",
            "note",
            " product",
            " promotion",
            ".\n",
            "-",
            " **",
            "User",
            " Engagement",
            " Strategy",
            "**:",
            " Promotion",
            " through",
            " social",
            " media",
            " (",
            "X",
            ")",
            " and",
            " Discord",
            ".\n",
            "-",
            " **",
            "User",
            " Support",
            " Channels",
            "**:",
            " Engagement",
            " through",
            " X",
            " and",
            " Discord",
            ".\n",
            "\n",
        ];

        let mut parser = StreamingParser::new();

        let items = {
            let mut items = vec![];
            for chunk in chunks {
                items.extend(parser.process_chunk(chunk));
            }
            items
        };

        assert_eq!(
            items,
            [
                TextDelta("#".into()),
                TextDelta(" Meeting".into()),
                TextDelta(" Details".into()),
                TextDelta("-".into()),
                TextDelta("**".into()),
                TextDelta("Date".into()),
                TextDelta(" and".into()),
                TextDelta(" Time".into()),
                TextDelta("**:".into()),
                TextDelta(" Not".into()),
                TextDelta(" explicitly".into()),
                TextDelta(" stated".into()),
                TextDelta(" in".into()),
                TextDelta(" the".into()),
                TextDelta(" transcript".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta("**".into()),
                TextDelta("Attend".into()),
                TextDelta("ees".into()),
                TextDelta("**:".into()),
                TextDelta(" Speaker".into()),
                TextDelta("0".into()),
                TextDelta(" (".into()),
                TextDelta("user".into()),
                TextDelta(")".into()),
                TextDelta(" is".into()),
                TextDelta(" the".into()),
                TextDelta(" only".into()),
                TextDelta(" participant".into()),
                TextDelta(" mentioned".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta("**".into()),
                TextDelta("Meeting".into()),
                TextDelta(" Purpose".into()),
                TextDelta("**:".into()),
                TextDelta(" Announcement".into()),
                TextDelta(" about".into()),
                TextDelta(" Hy".into()),
                TextDelta("pr".into()),
                TextDelta("note".into()),
                TextDelta(" product".into()),
                TextDelta(" and".into()),
                TextDelta(" its".into()),
                TextDelta(" features".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta("**".into()),
                TextDelta("Location".into()),
                TextDelta("**:".into()),
                TextDelta(" Apple".into()),
                TextDelta(" Park".into()),
                TextDelta(" (".into()),
                TextDelta("pres".into()),
                TextDelta("umably".into()),
                TextDelta(" live".into()),
                TextDelta(" session".into()),
                TextDelta(").\n\n".into()),
                TextDelta("#".into()),
                TextDelta(" Agenda".into()),
                TextDelta("-".into()),
                TextDelta("**".into()),
                TextDelta("Product".into()),
                TextDelta(" Announcement".into()),
                TextDelta("**:".into()),
                TextDelta(" Presentation".into()),
                TextDelta(" and".into()),
                TextDelta(" demonstration".into()),
                TextDelta(" of".into()),
                TextDelta(" Hy".into()),
                TextDelta("pr".into()),
                TextDelta("note".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("User".into()),
                TextDelta(" Experience".into()),
                TextDelta(" Overview".into()),
                TextDelta("**:".into()),
                TextDelta(" Discussion".into()),
                TextDelta(" on".into()),
                TextDelta(" how".into()),
                TextDelta(" Hy".into()),
                TextDelta("pr".into()),
                TextDelta("note".into()),
                TextDelta(" simpl".into()),
                TextDelta("ifies".into()),
                TextDelta(" note".into()),
                TextDelta("-taking".into()),
                TextDelta(" during".into()),
                TextDelta(" meetings".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Product".into()),
                TextDelta(" Different".into()),
                TextDelta("iation".into()),
                TextDelta("**:".into()),
                TextDelta(" Highlight".into()),
                TextDelta("ing".into()),
                TextDelta(" key".into()),
                TextDelta(" features".into()),
                TextDelta(" that".into()),
                TextDelta(" distinguish".into()),
                TextDelta(" Hy".into()),
                TextDelta("pr".into()),
                TextDelta("note".into()),
                TextDelta(" from".into()),
                TextDelta(" other".into()),
                TextDelta(" meeting".into()),
                TextDelta(" notes".into()),
                TextDelta(" apps".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Privacy".into()),
                TextDelta(" and".into()),
                TextDelta(" Security".into()),
                TextDelta(" Em".into()),
                TextDelta("phasis".into()),
                TextDelta("**:".into()),
                TextDelta(" Em".into()),
                TextDelta("phasis".into()),
                TextDelta(" on".into()),
                TextDelta(" data".into()),
                TextDelta(" privacy".into()),
                TextDelta(" and".into()),
                TextDelta(" local".into()),
                TextDelta("-first".into()),
                TextDelta(" architecture".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Extension".into()),
                TextDelta(" Support".into()),
                TextDelta("**:".into()),
                TextDelta(" Availability".into()),
                TextDelta(" of".into()),
                TextDelta(" a".into()),
                TextDelta(" wide".into()),
                TextDelta(" range".into()),
                TextDelta(" of".into()),
                TextDelta(" extensions".into()),
                TextDelta(" for".into()),
                TextDelta(" advanced".into()),
                TextDelta(" users".into()),
                TextDelta(".\n".into()),
                TextDelta("#".into()),
                TextDelta(" Discussion".into()),
                TextDelta(" Points".into()),
                TextDelta("-".into()),
                TextDelta("**".into()),
                TextDelta("Key".into()),
                TextDelta(" Features".into()),
                TextDelta(" of".into()),
                TextDelta(" Hy".into()),
                TextDelta("pr".into()),
                TextDelta("note".into()),
                TextDelta("**".into()),
                TextDelta(":".into()),
                TextDelta(" Listening".into()),
                TextDelta(" to".into()),
                TextDelta(" conversations".into()),
                TextDelta(" to".into()),
                TextDelta(" capture".into()),
                TextDelta(" key".into()),
                TextDelta(" points".into()),
                TextDelta(" without".into()),
                TextDelta(" needing".into()),
                TextDelta(" to".into()),
                TextDelta(" trans".into()),
                TextDelta("cribe".into()),
                TextDelta(" everything".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Note".into()),
                TextDelta("-taking".into()),
                TextDelta(" Process".into()),
                TextDelta("**:".into()),
                TextDelta(" Comb".into()),
                TextDelta("ining".into()),
                TextDelta(" notes".into()),
                TextDelta(" with".into()),
                TextDelta(" transcripts".into()),
                TextDelta(" for".into()),
                TextDelta(" context".into()),
                TextDelta(" and".into()),
                TextDelta(" facilitating".into()),
                TextDelta(" summary".into()),
                TextDelta(" generation".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Privacy".into()),
                TextDelta(" and".into()),
                TextDelta(" Data".into()),
                TextDelta(" Security".into()),
                TextDelta("**:".into()),
                TextDelta(" Built".into()),
                TextDelta("-in".into()),
                TextDelta(" offline".into()),
                TextDelta(" functionality".into()),
                TextDelta(" and".into()),
                TextDelta(" data".into()),
                TextDelta(" stored".into()),
                TextDelta(" on".into()),
                TextDelta(" local".into()),
                TextDelta(" devices".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("User".into()),
                TextDelta("-C".into()),
                TextDelta("entric".into()),
                TextDelta(" Design".into()),
                TextDelta("**:".into()),
                TextDelta(" Designed".into()),
                TextDelta(" for".into()),
                TextDelta(" a".into()),
                TextDelta(" wide".into()),
                TextDelta(" audience".into()),
                TextDelta(" with".into()),
                TextDelta(" simple".into()),
                TextDelta(" use".into()),
                TextDelta(" cases".into()),
                TextDelta(" and".into()),
                TextDelta(" flexibility".into()),
                TextDelta(" for".into()),
                TextDelta(" advanced".into()),
                TextDelta(" users".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Extension".into()),
                TextDelta(" E".into()),
                TextDelta("cosystem".into()),
                TextDelta("**:".into()),
                TextDelta(" Comprehensive".into()),
                TextDelta(" support".into()),
                TextDelta(" for".into()),
                TextDelta(" CRM".into()),
                TextDelta(" integration".into()),
                TextDelta(" and".into()),
                TextDelta(" other".into()),
                TextDelta(" extensions".into()),
                TextDelta(".\n\n".into()),
                TextDelta("#".into()),
                TextDelta(" Action".into()),
                TextDelta(" Items".into()),
                TextDelta("-".into()),
                TextDelta("**".into()),
                TextDelta("Call".into()),
                TextDelta(" Dent".into()),
                TextDelta("ist".into()),
                TextDelta("**:".into()),
                TextDelta(" Speaker".into()),
                TextDelta("0".into()),
                TextDelta("'s".into()),
                TextDelta(" personal".into()),
                TextDelta(" reminder".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Review".into()),
                TextDelta(" Insurance".into()),
                TextDelta(" Policy".into()),
                TextDelta("**:".into()),
                TextDelta(" Speaker".into()),
                TextDelta("0".into()),
                TextDelta("'s".into()),
                TextDelta(" personal".into()),
                TextDelta(" reminder".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Book".into()),
                TextDelta(" Vacation".into()),
                TextDelta("**:".into()),
                TextDelta(" Speaker".into()),
                TextDelta("0".into()),
                TextDelta("'s".into()),
                TextDelta(" personal".into()),
                TextDelta(" reminder".into()),
                TextDelta(".\n\n".into()),
                TextDelta("#".into()),
                TextDelta(" Next".into()),
                TextDelta(" Steps".into()),
                TextDelta("-".into()),
                TextDelta("**".into()),
                TextDelta("Follow".into()),
                TextDelta("-Up".into()),
                TextDelta(" Actions".into()),
                TextDelta("**:".into()),
                TextDelta(" Speaker".into()),
                TextDelta("0".into()),
                TextDelta("'s".into()),
                TextDelta(" personal".into()),
                TextDelta(" reminder".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Next".into()),
                TextDelta(" Meeting".into()),
                TextDelta(" Details".into()),
                TextDelta("**:".into()),
                TextDelta(" Not".into()),
                TextDelta(" explicitly".into()),
                TextDelta(" stated".into()),
                TextDelta(" in".into()),
                TextDelta(" the".into()),
                TextDelta(" transcript".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("Product".into()),
                TextDelta(" Promotion".into()),
                TextDelta("**:".into()),
                TextDelta(" Speaker".into()),
                TextDelta("0".into()),
                TextDelta("'s".into()),
                TextDelta(" role".into()),
                TextDelta(" as".into()),
                TextDelta(" a".into()),
                TextDelta(" representative".into()),
                TextDelta(" for".into()),
                TextDelta(" Hy".into()),
                TextDelta("pr".into()),
                TextDelta("note".into()),
                TextDelta(" product".into()),
                TextDelta(" promotion".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("User".into()),
                TextDelta(" Engagement".into()),
                TextDelta(" Strategy".into()),
                TextDelta("**:".into()),
                TextDelta(" Promotion".into()),
                TextDelta(" through".into()),
                TextDelta(" social".into()),
                TextDelta(" media".into()),
                TextDelta(" (".into()),
                TextDelta("X".into()),
                TextDelta(")".into()),
                TextDelta(" and".into()),
                TextDelta(" Discord".into()),
                TextDelta(".\n".into()),
                TextDelta("-".into()),
                TextDelta(" **".into()),
                TextDelta("User".into()),
                TextDelta(" Support".into()),
                TextDelta(" Channels".into()),
                TextDelta("**:".into()),
                TextDelta(" Engagement".into()),
                TextDelta(" through".into()),
                TextDelta(" X".into()),
                TextDelta(" and".into()),
                TextDelta(" Discord".into()),
                TextDelta(".\n".into())
            ]
        );
    }
}
