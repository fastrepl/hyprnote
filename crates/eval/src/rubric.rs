use std::collections::HashMap;

use crate::{
    ChatCompleter, ConfidenceInterval, aggregate_grader_responses,
    generate_structured_grader_response, generate_structured_grader_response_multi,
};

/// A rubric defines a criterion for evaluating LLM output.
#[derive(Debug, Clone)]
pub struct Rubric {
    pub name: String,
    pub description: String,
    pub grader: GraderType,
}

/// Score represents the result of evaluating output against a rubric.
#[derive(Debug, Clone, Default)]
pub struct Score {
    pub rubric_name: String,
    pub passed: bool,
    pub value: i32,
    pub reasoning: String,
    pub grader_type: String,
    pub grader_model: String,
    pub pass_rate: f64,
    pub samples: i32,
    pub standard_deviation: f64,
    pub variance: f64,
    pub confidence_interval: ConfidenceInterval,
    pub pass_count: i32,
    pub fail_count: i32,
}

/// GraderType specifies how a rubric should be evaluated.
#[derive(Debug, Clone)]
pub enum GraderType {
    /// Function-based grader that takes output and returns (passed, reasoning)
    Func(fn(&str) -> (bool, String)),
    /// LLM-based grader with configurable number of samples for consensus
    Llm { samples: i32 },
}

impl Default for GraderType {
    fn default() -> Self {
        GraderType::Llm { samples: 1 }
    }
}

pub fn grade_with_llm(
    client: &dyn ChatCompleter,
    model: &str,
    rubric: &Rubric,
    output: &str,
    inputs: Option<&HashMap<String, serde_json::Value>>,
    on_evaluation: Option<&dyn Fn()>,
) -> Score {
    let samples = match &rubric.grader {
        GraderType::Llm { samples } => *samples,
        _ => 1,
    };

    let prompt = build_llm_prompt(rubric, output, inputs);

    let mut score = Score {
        rubric_name: rubric.name.clone(),
        grader_type: "llm".to_string(),
        grader_model: model.to_string(),
        samples: 1,
        ..Default::default()
    };

    if samples <= 1 {
        match generate_structured_grader_response(client, model, &prompt) {
            Ok(grader_resp) => {
                score.passed = grader_resp.verdict == "PASS";
                score.value = if score.passed { 1 } else { 0 };
                score.reasoning = grader_resp.reasoning;
                score.pass_rate = if score.passed { 1.0 } else { 0.0 };
            }
            Err(e) => {
                score.reasoning = format!("grader error: {}", e);
            }
        }
        if let Some(cb) = on_evaluation {
            cb();
        }
        return score;
    }

    match generate_structured_grader_response_multi(client, model, &prompt, samples) {
        Ok(responses) => {
            if let Some(cb) = on_evaluation {
                for _ in 0..samples {
                    cb();
                }
            }

            let agg = aggregate_grader_responses(&responses);
            score.passed = agg.passed;
            score.value = if score.passed { 1 } else { 0 };
            score.reasoning = agg.reasoning;
            score.pass_rate = agg.pass_stats.pass_rate;
            score.samples = agg.pass_stats.samples;
            score.standard_deviation = agg.pass_stats.standard_deviation;
            score.variance = agg.pass_stats.variance;
            score.confidence_interval = agg.pass_stats.confidence_interval;
            score.pass_count = agg.pass_stats.pass_count;
            score.fail_count = agg.pass_stats.fail_count;
        }
        Err(e) => {
            score.reasoning = format!("grader error: {}", e);
        }
    }

    score
}

pub fn grade_with_func(
    rubric: &Rubric,
    output: &str,
    grader_fn: fn(&str) -> (bool, String),
) -> Score {
    let (passed, reasoning) = grader_fn(output);
    Score {
        rubric_name: rubric.name.clone(),
        passed,
        value: if passed { 1 } else { 0 },
        reasoning,
        grader_type: "func".to_string(),
        ..Default::default()
    }
}

fn build_llm_prompt(
    rubric: &Rubric,
    output: &str,
    inputs: Option<&HashMap<String, serde_json::Value>>,
) -> String {
    let mut inputs_str = String::new();
    if let Some(inputs) = inputs {
        if !inputs.is_empty() {
            inputs_str.push_str("\nInput Variables:\n");
            for (k, v) in inputs {
                inputs_str.push_str(&format!("- {}: {}\n", k, v));
            }
        }
    }

    format!(
        r#"You are an evaluation judge. Score the following output against this rubric.

Rubric: {}
Description: {}
{}
Output to evaluate:
---
{}
---"#,
        rubric.name, rubric.description, inputs_str, output
    )
}

/// A simple grader function that checks if output is non-empty.
pub fn is_non_empty(output: &str) -> (bool, String) {
    if output.trim().is_empty() {
        (false, "output is empty".to_string())
    } else {
        (true, "output is non-empty".to_string())
    }
}
