pub const ENHANCE_AUTO: &str = include_str!("../assets/enhance-auto.gbnf");

pub enum GBNF {
    Enhance(Option<Vec<String>>),
}

impl GBNF {
    pub fn build(&self) -> String {
        match self {
            GBNF::Enhance(Some(_)) => ENHANCE_AUTO.to_string(),
            GBNF::Enhance(None) => ENHANCE_AUTO.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use indoc::indoc;

    #[test]
    fn test_1() {
        let gbnf = gbnf_validator::Validator::new().unwrap();
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
        assert!(gbnf.validate(ENHANCE_AUTO, input_1).unwrap());
    }

    #[test]
    fn test_2() {
        let gbnf = gbnf_validator::Validator::new().unwrap();
        let input = indoc! {"
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
            - **Follow on X**: [Thank you](https://x.com/yujonglee).
            
            "};

        assert!(gbnf.validate(ENHANCE_AUTO, input).unwrap());
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
