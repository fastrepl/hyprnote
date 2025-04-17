use kalosm_sample::Parse;

#[allow(dead_code)]
#[derive(Debug, Clone, Parse)]
pub struct EnhanceResponse {
    pub content: String,
}

#[cfg(test)]
mod tests {
    use kalosm_sample::{
        CreateParserState, LiteralParser, Parse, ParseStatus, Parser, ParserExt, StopOn,
    };

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
        let full = r##"<headers>Hello</headers><title>World</title>"##;

        let headers_parser = LiteralParser::new("<headers>")
            .then(StopOn::new("</headers>"))
            .map_output(|(_, headers)| headers.trim_end_matches("</headers>").to_string());

        let title_parser = LiteralParser::new("<title>")
            .then(StopOn::new("</title>"))
            .map_output(|(_, title)| title.trim_end_matches("</title>").to_string());

        let parser = headers_parser.then(title_parser);

        let parser_state = parser.create_parser_state();

        if let ParseStatus::Finished { result, .. } =
            parser.parse(&parser_state, full.as_bytes()).unwrap()
        {
            println!("{:?}", result);
        }
    }
}
