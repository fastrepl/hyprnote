use crate::{
    CheckResult, GraderType, Rubric, Task, find_headings, find_lists, grade, is_non_empty,
};

fn format_grader(output: &str) -> (bool, String) {
    let result = grade(
        output,
        vec![
            Box::new(|node| {
                let headings = find_headings(node);
                if headings.len() >= 2 {
                    vec![CheckResult::pass(1, "has at least 2 sections")]
                } else {
                    vec![CheckResult::fail(
                        1,
                        format!("expected at least 2 sections, got {}", headings.len()),
                    )]
                }
            }),
            Box::new(|node| {
                find_headings(node)
                    .iter()
                    .enumerate()
                    .map(|(i, h)| {
                        if h.depth == 1 {
                            CheckResult::pass(1, format!("section {} is h1", i + 1))
                        } else {
                            CheckResult::fail(
                                1,
                                format!("section {}: expected h1, got h{}", i + 1, h.depth),
                            )
                        }
                    })
                    .collect()
            }),
            Box::new(|node| {
                let lists = find_lists(node);
                if lists.is_empty() {
                    return vec![CheckResult::fail(1, "no lists found")];
                }
                lists
                    .iter()
                    .enumerate()
                    .map(|(i, l)| {
                        if !l.ordered {
                            CheckResult::pass(1, format!("list {} is unordered", i + 1))
                        } else {
                            CheckResult::fail(
                                1,
                                format!("list {}: expected unordered, got ordered", i + 1),
                            )
                        }
                    })
                    .collect()
            }),
        ],
    );

    (result.score >= 0.8, result.summary())
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
