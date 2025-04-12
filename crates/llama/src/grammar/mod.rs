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

    struct TestCase {
        pub grammar: &'static str,
        pub intent: &'static str,
        pub text: &'static str,
        pub valid: bool,
        pub debug: bool,
    }

    #[test]
    fn test_markdown_grammar() {
        let test_cases = vec![
            TestCase {
                grammar: MARKDOWN_GRAMMAR,
                intent: "should start with a heading",
                text: indoc::indoc! {r#"
                Here's a response:

                # This is a test"#},
                valid: false,
                debug: false,
            },
            TestCase {
                grammar: MARKDOWN_GRAMMAR,
                intent: "header-content pair is required",
                text: indoc::indoc! {r#"
                # This is a test
                
                ## This is a test"#},
                valid: false,
                debug: false,
            },
            TestCase {
                grammar: MARKDOWN_GRAMMAR,
                intent: "footnote is not allowed. Currently we prevent both '[' and '^' to achieve this.",
                text: indoc::indoc! {r#"
                # This is a test

                Hi Hello. [^1]"#},
                valid: false,
                debug: false,
            },
            TestCase {
                grammar: MARKDOWN_GRAMMAR,
                intent: "codeblock is not allowed. Currently we prevent '`' to achieve this.",
                text: indoc::indoc! {r#"
                # This is a test

                Hi Hello. `code`.
                ```code
                123
                ```"#},
                valid: false,
                debug: false,
            },
            TestCase {
                grammar: MARKDOWN_GRAMMAR,
                intent: "content should not start with bold text. we prevent '*'(but allow '-') to achieve this.",
                text: indoc::indoc! {r#"
                # Enhanced Meeting Notes

                **What Hyprnote Does**"#},
                valid: false,
                debug: false,
            },
        ];

        let gbnf = gbnf_validator::Validator::new().unwrap();

        for (i, test_case) in test_cases.iter().enumerate() {
            match gbnf.validate(test_case.grammar, test_case.text) {
                Err(e) => panic!("{}th_test_case_failed: {}", i, e),
                Ok(valid_actual) => {
                    if valid_actual != test_case.valid {
                        println!("{}", "=".repeat(80));
                        println!("{}_failed. intent: {}", i, test_case.intent);
                        debug_grammar_failure_point(&gbnf, test_case.grammar, test_case.text);
                        println!("\n{}", "=".repeat(80));

                        panic!("{}th_test_case_failed", i);
                    }

                    if test_case.debug {
                        println!("{}", "=".repeat(80));
                        println!("{}_passed. intent: {}", i, test_case.intent);
                        debug_grammar_failure_point(&gbnf, test_case.grammar, test_case.text);
                        println!("\n{}", "=".repeat(80));
                    }
                }
            }
        }
    }

    fn debug_grammar_failure_point(gbnf: &gbnf_validator::Validator, grammar: &str, text: &str) {
        use colored::Colorize;

        for length in 1..=text.len() {
            let substring = &text[0..length];
            let current_char = text.chars().nth(length - 1).unwrap();

            match gbnf.validate(grammar, substring) {
                Ok(true) => print!("{}", current_char.to_string().green()),
                Ok(false) => print!("{}", current_char.to_string().red()),
                Err(_) => print!("{}", current_char.to_string().yellow()),
            }
        }
    }
}
