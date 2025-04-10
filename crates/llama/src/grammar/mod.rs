use include_url_macro::include_url;

pub const MARKDOWN_GRAMMAR: &str = include_str!("./markdown.gbnf");

#[allow(dead_code)]
pub const JSON_ARR_GRAMMAR: &str = include_url!(
    "https://raw.githubusercontent.com/ggml-org/llama.cpp/7a84777/grammars/json_arr.gbnf"
);

#[allow(dead_code)]
pub const JSON_GRAMMAR: &str =
    include_url!("https://raw.githubusercontent.com/ggml-org/llama.cpp/7a84777/grammars/json.gbnf");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_markdown_grammar() {
        let a = include_url!(
            "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/refs/heads/main/README.md"
        );
        let md_a = hypr_buffer::opinionated_md_to_md(a).unwrap();
        assert!(md_a.len() > 10);

        let b = include_url!("https://raw.githubusercontent.com/codecrafters-io/build-your-own-x/refs/heads/master/README.md");
        let md_b = hypr_buffer::opinionated_md_to_md(b).unwrap();
        assert!(md_b.len() > 10);
    }
}
