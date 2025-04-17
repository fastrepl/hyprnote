use kalosm_sample::{LiteralParser, Parse, ParserExt, StopOn};

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct EnhanceResponse {
    pub thinking: String,
    pub content: String,
}

impl Parse for EnhanceResponse {
    fn new_parser() -> impl kalosm_sample::SendCreateParserState<Output = Self> {
        let thinking_start = LiteralParser::from("<thinking>\n");
        let thinking_content = StopOn::from("</thinking>");
        let thinking_end = LiteralParser::from("</thinking>\n");

        let content_start = LiteralParser::from("<content>\n");
        let content_content = StopOn::from("</content>");
        let content_end = LiteralParser::from("</content>");

        thinking_start
            .ignore_output_then(thinking_content)
            .then_ignore_output(thinking_end)
            .then(
                content_start
                    .ignore_output_then(content_content)
                    .then_ignore_output(content_end),
            )
            .map_output(|(thinking, content)| EnhanceResponse { thinking, content })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use kalosm_sample::{CreateParserState, Parse, ParseStatus, Parser};

    #[derive(Debug, Clone, Parse)]
    struct Pet {
        pub name: String,
        pub description: String,
        pub color: String,
    }

    #[test]
    fn test_json() {
        let full = r##"{ "name": "Buddy", "description": "A friendly little dog who loves to play fetch. He has golden brown fur that shines like the sun.", "color": "Yellow-golden," }"##;

        let chunks = full
            .chars()
            .collect::<Vec<_>>()
            .chunks(3)
            .map(|c| c.iter().collect::<String>())
            .collect::<Vec<_>>();

        let parser = Pet::new_parser();
        let mut parser_state = parser.create_parser_state();
        let mut result = None;

        for chunk in chunks {
            match parser.parse(&parser_state, chunk.as_bytes()).unwrap() {
                ParseStatus::Incomplete { new_state, .. } => {
                    parser_state = new_state;
                }
                ParseStatus::Finished { result: res, .. } => {
                    result = Some(res);
                    break;
                }
            }
        }

        assert!(result.is_some());
        assert_eq!(result.as_ref().unwrap().name, "Buddy");
        assert_eq!(result.as_ref().unwrap().description, "A friendly little dog who loves to play fetch. He has golden brown fur that shines like the sun.");
        assert_eq!(result.as_ref().unwrap().color, "Yellow-golden,");
    }

    #[test]
    fn test_custom() {
        let full = r##"<thinking>"##;
        let parser = EnhanceResponse::new_parser();
        let parser_state = parser.create_parser_state();

        parser.parse(&parser_state, full.as_bytes()).unwrap();
    }
}
