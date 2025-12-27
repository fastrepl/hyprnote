use hypr_eval::{FormatValidatorType, GraderSpec, RubricSpec, TaskSubmission};
use hypr_template_eval::{MdgenSystem, Template};

pub fn all_submissions() -> Vec<TaskSubmission> {
    vec![mdgen_submission()]
}

pub fn mdgen_submission() -> TaskSubmission {
    let template = MdgenSystem {
        topic: "Go tests for LLM evaluation".to_string(),
    };
    let prompt = Template::render(&template).expect("Failed to render template");

    TaskSubmission {
        name: "mdgen".to_string(),
        prompt,
        rubrics: vec![
            RubricSpec {
                name: "non_empty".to_string(),
                description: "Output is non-empty".to_string(),
                grader: GraderSpec::FormatValidator(FormatValidatorType::NonEmpty),
            },
            RubricSpec {
                name: "format".to_string(),
                description: "Output follows h1 headers with unordered lists format".to_string(),
                grader: GraderSpec::FormatValidator(FormatValidatorType::MdgenFormat),
            },
            RubricSpec {
                name: "concise".to_string(),
                description: "Output is concise and under 150 words, staying focused on the topic"
                    .to_string(),
                grader: GraderSpec::Llm { samples: 3 },
            },
            RubricSpec {
                name: "technically_accurate".to_string(),
                description: "Output is technically accurate about Go testing and LLM evaluation"
                    .to_string(),
                grader: GraderSpec::Llm { samples: 3 },
            },
        ],
        samples: 3,
    }
}

pub fn filter_submissions(
    all_submissions: &[TaskSubmission],
    filter: Option<&[String]>,
) -> Vec<TaskSubmission> {
    match filter {
        None => all_submissions.to_vec(),
        Some(filter) => {
            let filter_set: std::collections::HashSet<String> =
                filter.iter().map(|s| s.to_lowercase()).collect();
            all_submissions
                .iter()
                .filter(|s| filter_set.contains(&s.name.to_lowercase()))
                .cloned()
                .collect()
        }
    }
}
