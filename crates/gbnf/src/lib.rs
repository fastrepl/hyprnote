#[derive(specta::Type, serde::Serialize, serde::Deserialize)]
#[serde(tag = "task")]
pub enum Grammar {
    #[serde(rename = "enhance")]
    Enhance { sections: Option<Vec<String>> },
    #[serde(rename = "title")]
    Title,
    #[serde(rename = "tags")]
    Tags,
}

impl Grammar {
    pub fn build(&self) -> String {
        match self {
            Grammar::Enhance { sections } => build_enhance_other_grammar(sections),
            Grammar::Title => build_title_grammar(),
            Grammar::Tags => build_tags_grammar(),
        }
    }
}

#[allow(dead_code)]
fn build_enhance_hypr_grammar(_s: &Option<Vec<String>>) -> String {
    vec![
        r##"root ::= think content"##,
        r##"line ::= "- " [A-Z] [^*.\n[(]+ ".\n""##,
        r##"think ::= "<think>\n" line line? line? line? "</think>""##,
        r##"content ::= .*"##,
    ]
    .join("\n")
}

fn build_known_sections_grammar(sections: &[String]) -> String {
    let mut rules = vec![];

    let mut root_parts = vec![];
    for i in 0..sections.len() {
        root_parts.push(format!("section{}", i));
    }

    let root_rule = format!("root ::= {}", root_parts.join(" "));
    rules.push(root_rule);

    for (i, section) in sections.iter().enumerate() {
        let section_rule = format!(
            r##"section{} ::= "# {}\n\n" bline bline bline? bline? bline? "\n""##,
            i, section
        );
        rules.push(section_rule);
    }

    rules
        .push(r##"bline ::= "- **" [A-Z] [^*\n:]+ "**: " ([^*;,[.\n] | link)+ ".\n""##.to_string());
    rules.push(r##"link ::= "[" [^\]]+ "]" "(" [^)]+ ")""##.to_string());

    rules.join("\n")
}

fn build_enhance_other_grammar(s: &Option<Vec<String>>) -> String {
    let auto = vec![
        r##"root ::= thinking sectionf section section section? section?"##,
        r##"sectionf ::= "# Objective\n\n" line line? line? "\n""##,
        r##"section ::= header "\n\n" bline bline bline? bline? bline? "\n""##,
        r##"header ::= "# " [^*.\n]+"##,
        r##"line ::= "- " [A-Z] [^*.\n[(]+ ".\n""##,
        r##"bline ::= "- **" [A-Z] [^*\n:]+ "**: " ([^*;,[.\n] | link)+ ".\n""##,
        r##"hsf ::= "- Objective\n""##,
        r##"hd ::= "- " [A-Z] [^[(*\n]+ "\n""##,
        r##"thinking ::= "<thinking>\n" hsf hd hd? hd? hd? "</thinking>""##,
        r##"link ::= "[" [^\]]+ "]" "(" [^)]+ ")""##,
    ]
    .join("\n");

    match s {
        None => auto,
        Some(v) if v.is_empty() => auto,
        Some(v) => build_known_sections_grammar(v),
    }
}

fn build_title_grammar() -> String {
    vec![
        r##"lowercase ::= [a-z0-9]"##,
        r##"uppercase ::= [A-Z]"##,
        r##"word ::= uppercase lowercase*"##,
        r##"root ::= word (" " word)*"##,
    ]
    .join("\n")
}

fn build_tags_grammar() -> String {
    vec![
        r##"root ::= \"[\" \"\" word \"\" (\",\" ws \"\" word \"\")* \"]\""##,
        r##"word ::= [a-zA-Z0-9_-]+"##,
        r##"ws ::= \" \"*"##,
    ]
    .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use indoc::indoc;

    #[test]
    fn test_title_grammar() {
        let gbnf = gbnf_validator::Validator::new().unwrap();

        for (input, expected) in vec![
            ("Meeting Summary", true),
            ("Product Review Discussion", true),
            ("A", true),
            ("Planning Session", true),
            ("Q1 Planning Session", true),
            ("meeting summary", false),
            ("Meeting-Summary", false),
            ("", false),
        ] {
            let result = gbnf.validate(&build_title_grammar(), input).unwrap();
            assert_eq!(result, expected, "failed: {}", input);
        }
    }

    #[test]
    fn test_tags_grammar() {
        let gbnf = gbnf_validator::Validator::new().unwrap();

        for (input, expected) in vec![
            ("[\"meeting\", \"summary\"]", true),
            ("[\"meeting\", \"summary\", \"\"]", false),
        ] {
            let result = gbnf.validate(&build_tags_grammar(), input).unwrap();
            assert_eq!(result, expected, "failed: {}", input);
        }
    }

    #[test]
    fn test_enhance_grammar() {
        let input_1 = "<headers>\n- Objective\n- Key Takeaways\n- Importance of Complementary Skills\n- Benefits of Using Online Resources\n- Advice for Undergrad Students\n</headers># Objective\n\n- **Search is the Best Way to Find Answers**: The speaker emphasizes the importance of utilizing online resources like Google to find answers to questions.\n- **Value in Complementary Skills**: The speaker highlights the need to acquire complementary skills to traditional research methods.\n\n# Key Takeaways\n\n- **Complementary skills include both traditional research and online resource utilization**: The speaker suggests that skills like using a blank sheet of paper with no Internet and effective Google searching are essential.\n- **Online resources can help find pre-solved problems**: The speaker advises investing time in finding existing resources and communities that have already solved problems.\n\n# Importance of Complementary Skills\n\n- **Traditional research is just the starting point**: The speaker suggests that traditional research methods are just the beginning and should be complemented with other skills.\n- **Effective use of online resources can save time and effort**: The speaker highlights the benefits of utilizing online resources in research and problem-solving.\n\n# Benefits of Using Online Resources\n\n- **Access to knowledge from experts and communities**: The speaker suggests that online resources provide access to knowledge and expertise from experienced individuals.\n- **Time-saving and efficient**: The speaker emphasizes the benefits of finding pre-solved problems through online resources.\n\n# Advice for Undergrad Students\n\n- **Start by searching online**: The speaker advises undergrad students to start by searching online for answers to questions and exploring different resources.\n- **Be open to finding existing solutions**: The speaker emphasizes the importance of being open to finding pre-solved problems and leveraging existing resources.\n\n";
        let input_2 = indoc! {"
            <headers>
            - Objective
            - Key Takeaways
            - Importance of Complementary Skills
            - Benefits of Using Online Resources
            - Advice for Undergrad Students
            </headers># Objective
    
            - **Search is the Best Way to Find Answers**: The speaker emphasizes the importance of utilizing online resources like Google to find answers to questions.
            - **Value in Complementary Skills**: The speaker highlights the need to acquire complementary skills to traditional research methods.
    
            # Key Takeaways
    
            - **Complementary skills include both traditional research and online resource utilization**: The speaker suggests that skills like using a blank sheet of paper with no Internet and effective Google searching are essential.
            - **Online resources can help find pre-solved problems**: The speaker advises investing time in finding existing resources and communities that have already solved problems.
    
            # Importance of Complementary Skills
    
            - **Traditional research is just the starting point**: The speaker suggests that traditional research methods are just the beginning and should be complemented with other skills.
            - **Effective use of online resources can save time and effort**: The speaker highlights the benefits of utilizing online resources in research and problem-solving.
    
            # Benefits of Using Online Resources
    
            - **Access to knowledge from experts and communities**: The speaker suggests that online resources provide access to knowledge and expertise from experienced individuals.
            - **Time-saving and efficient**: The speaker emphasizes the benefits of finding pre-solved problems through online resources.
    
            # Advice for Undergrad Students
    
            - **Start by searching online**: The speaker advises undergrad students to start by searching online for answers to questions and exploring different resources.
            - **Be open to finding existing solutions**: The speaker emphasizes the importance of being open to finding pre-solved problems and leveraging existing resources.
            
            "};

        assert_eq!(input_1, input_2);

        let _gbnf = gbnf_validator::Validator::new().unwrap();
        // assert!(gbnf.validate(ENHANCE_AUTO, input_1).unwrap());
    }

    #[allow(dead_code)]
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
