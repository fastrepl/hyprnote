use kalosm_sample::{Parse, Schema};

#[derive(Schema, Parse, Debug, Clone, serde::Serialize, serde::Deserialize)]
struct EnhanceResponse {
    pub name: String,
    pub description: String,
    pub age: u8,
}

#[cfg(test)]
mod tests {
    use super::*;
    use kalosm_sample::{CreateParserState, Parser};

    #[test]
    fn test_enhance_response() {
        let parser = EnhanceResponse::new_parser();
        let state = parser.create_parser_state();

        assert!(parser.parse(&state, b"{").is_ok());
        assert!(parser.parse(&state, b"\"name\":").is_err());
    }
}
