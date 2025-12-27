use crate::{
    FormatSpec, GraderType, HeaderSpec, Rubric, SectionSpec, Task, is_non_empty, match_format,
};

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
    use hypr_template_eval::{MdgenSystem, Template};
    let template = MdgenSystem {
        topic: "Go tests for LLM evaluation".to_string(),
    };
    let prompt = Template::render(&template).expect("Failed to render template");

    Task {
        name: "mdgen".to_string(),
        template_path: "templates/mdgen.jinja".to_string(),
        template_content: Some(prompt),
        inputs: None,
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
