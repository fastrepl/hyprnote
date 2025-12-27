use std::collections::HashMap;

use crate::{
    FormatSpec, GraderType, HeaderSpec, Inputs, Rubric, SectionSpec, Task, is_non_empty,
    match_format,
};

#[derive(Clone)]
pub struct MDGenInputs {
    pub topic: String,
}

impl Inputs for MDGenInputs {
    fn to_map(&self) -> HashMap<String, serde_json::Value> {
        let mut map = HashMap::new();
        map.insert(
            "topic".to_string(),
            serde_json::Value::String(self.topic.clone()),
        );
        map
    }
}

const MDGEN_TEMPLATE: &str = r#"You are a careful technical writer.

Write a short Markdown document about "{{ topic }}".

Requirements:

- Must start with a level-1 heading (# ...)
- Must include a bullet list (at least 3 items)

Only output Markdown. No surrounding explanations.
"#;

fn format_grader(output: &str) -> (bool, String) {
    let spec = FormatSpec {
        sections: vec![
            SectionSpec {
                header: HeaderSpec {
                    level: 1,
                    text: String::new(),
                },
                list_only: true,
            },
            SectionSpec {
                header: HeaderSpec {
                    level: 1,
                    text: String::new(),
                },
                list_only: true,
            },
        ],
    };
    match_format(output, &spec)
}

pub fn mdgen_task() -> Task {
    Task {
        name: "mdgen".to_string(),
        template_path: "templates/mdgen.jinja".to_string(),
        template_content: Some(MDGEN_TEMPLATE.to_string()),
        inputs: Some(Box::new(MDGenInputs {
            topic: "Go tests for LLM evaluation".to_string(),
        })),
        samples: 3,
        rubrics: vec![
            Rubric {
                name: "non_empty".to_string(),
                description: "Output is non-empty".to_string(),
                grader: GraderType::Func(is_non_empty),
            },
            Rubric {
                name: "format".to_string(),
                description: "Output follows h1 headers with unordered lists format".to_string(),
                grader: GraderType::Func(format_grader),
            },
            Rubric {
                name: "concise".to_string(),
                description: "Output is concise and under 150 words, staying focused on the topic"
                    .to_string(),
                grader: GraderType::Llm { samples: 3 },
            },
            Rubric {
                name: "technically_accurate".to_string(),
                description: "Output is technically accurate about Go testing and LLM evaluation"
                    .to_string(),
                grader: GraderType::Llm { samples: 3 },
            },
        ],
    }
}
