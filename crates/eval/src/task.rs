use std::collections::HashMap;

use crate::{
    ChatCompleter, ClientError, GraderType, Rubric, Score, calc_pass_stats,
    generate_text_multi_with_generation_id, generate_text_with_generation_id, grade_with_func,
    grade_with_func_inputs, grade_with_llm,
};

#[deprecated(since = "0.2.0", note = "Use EvalCase with meta field instead")]
pub trait Inputs: Send + Sync {
    fn to_map(&self) -> HashMap<String, serde_json::Value>;
}

#[deprecated(since = "0.2.0", note = "Use EvalCase and Executor instead")]
#[derive(Clone)]
pub struct Task {
    pub name: String,
    pub template_path: String,
    pub template_content: Option<String>,
    pub inputs: Option<Box<dyn Inputs + Send + Sync>>,
    pub rubrics: Vec<Rubric>,
    pub samples: i32,
}

impl Task {
    pub fn new(
        name: &str,
        inputs: Option<Box<dyn Inputs + Send + Sync>>,
        rubrics: Vec<Rubric>,
    ) -> Self {
        Self {
            name: name.to_string(),
            template_path: format!("templates/{}.jinja", name),
            template_content: None,
            inputs,
            rubrics,
            samples: 1,
        }
    }

    pub fn with_template_content(mut self, content: &str) -> Self {
        self.template_content = Some(content.to_string());
        self
    }

    pub fn with_samples(mut self, samples: i32) -> Self {
        self.samples = samples;
        self
    }

    pub fn render_prompt(&self) -> Result<String, String> {
        let template_content = match &self.template_content {
            Some(content) => content.clone(),
            None => return Err(format!("No template content for task {}", self.name)),
        };

        // Simple string replacement for {{ key }} patterns
        let mut result = template_content;
        if let Some(ref inputs) = self.inputs {
            let map = inputs.to_map();
            for (key, value) in map {
                let placeholder = format!("{{{{ {} }}}}", key);
                let replacement = match value {
                    serde_json::Value::String(s) => s,
                    other => other.to_string(),
                };
                result = result.replace(&placeholder, &replacement);
            }
        }

        Ok(result)
    }

    pub fn execute(&self, client: &dyn ChatCompleter, model: &str) -> Result<String, ClientError> {
        let (output, _) = self.execute_with_generation_id(client, model)?;
        Ok(output)
    }

    pub fn execute_with_generation_id(
        &self,
        client: &dyn ChatCompleter,
        model: &str,
    ) -> Result<(String, String), ClientError> {
        let prompt = self.render_prompt().map_err(|e| {
            ClientError::Json(serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::Other,
                e,
            )))
        })?;
        generate_text_with_generation_id(client, model, &prompt)
    }

    pub fn execute_multi(
        &self,
        client: &dyn ChatCompleter,
        model: &str,
    ) -> Result<Vec<String>, ClientError> {
        let (outputs, _) = self.execute_multi_with_generation_id(client, model)?;
        Ok(outputs)
    }

    pub fn execute_multi_with_generation_id(
        &self,
        client: &dyn ChatCompleter,
        model: &str,
    ) -> Result<(Vec<String>, String), ClientError> {
        let prompt = self.render_prompt().map_err(|e| {
            ClientError::Json(serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::Other,
                e,
            )))
        })?;

        let n = self.samples;
        if n <= 1 {
            let (output, gen_id) = generate_text_with_generation_id(client, model, &prompt)?;
            return Ok((vec![output], gen_id));
        }

        generate_text_multi_with_generation_id(client, model, &prompt, n)
    }

    pub fn grade(&self, client: &dyn ChatCompleter, model: &str, output: &str) -> Vec<Score> {
        self.grade_with_progress(client, model, output, None)
    }

    pub fn grade_with_progress(
        &self,
        client: &dyn ChatCompleter,
        model: &str,
        output: &str,
        on_evaluation: Option<&dyn Fn()>,
    ) -> Vec<Score> {
        let input_map = self.inputs.as_ref().map(|i| i.to_map());

        self.rubrics
            .iter()
            .map(|rubric| match &rubric.grader {
                GraderType::Func(f) => {
                    let score = grade_with_func(rubric, output, *f);
                    if let Some(cb) = on_evaluation {
                        cb();
                    }
                    score
                }
                GraderType::FuncWithInputs(f) => {
                    let inputs = input_map.clone().unwrap_or_default();
                    let score = grade_with_func_inputs(rubric, output, &inputs, *f);
                    if let Some(cb) = on_evaluation {
                        cb();
                    }
                    score
                }
                GraderType::Llm { .. } => grade_with_llm(
                    client,
                    model,
                    rubric,
                    output,
                    input_map.as_ref(),
                    on_evaluation,
                ),
            })
            .collect()
    }

    pub fn grade_multi(
        &self,
        client: &dyn ChatCompleter,
        model: &str,
        outputs: &[String],
    ) -> Vec<Score> {
        self.grade_multi_with_progress(client, model, outputs, None)
    }

    pub fn grade_multi_with_progress(
        &self,
        client: &dyn ChatCompleter,
        model: &str,
        outputs: &[String],
        on_evaluation: Option<&dyn Fn()>,
    ) -> Vec<Score> {
        if outputs.is_empty() {
            return vec![];
        }

        if outputs.len() == 1 {
            return self.grade_with_progress(client, model, &outputs[0], on_evaluation);
        }

        let all_scores: Vec<Vec<Score>> = outputs
            .iter()
            .map(|output| self.grade_with_progress(client, model, output, on_evaluation))
            .collect();

        self.rubrics
            .iter()
            .enumerate()
            .map(|(rubric_idx, rubric)| {
                let mut pass_count = 0;
                let mut first_reasoning = String::new();
                let mut grader_type = String::new();
                let mut grader_model = String::new();

                for (output_idx, scores) in all_scores.iter().enumerate() {
                    if rubric_idx < scores.len() {
                        let s = &scores[rubric_idx];
                        if s.passed {
                            pass_count += 1;
                        }
                        if output_idx == 0 {
                            first_reasoning = s.reasoning.clone();
                            grader_type = s.grader_type.clone();
                            grader_model = s.grader_model.clone();
                        }
                    }
                }

                let stats = calc_pass_stats(pass_count, outputs.len() as i32);
                Score {
                    rubric_name: rubric.name.clone(),
                    passed: stats.pass_rate >= 0.5,
                    value: if stats.pass_rate >= 0.5 { 1 } else { 0 },
                    reasoning: first_reasoning,
                    grader_type,
                    grader_model,
                    pass_rate: stats.pass_rate,
                    samples: stats.samples,
                    standard_deviation: stats.standard_deviation,
                    variance: stats.variance,
                    confidence_interval: stats.confidence_interval,
                    pass_count: stats.pass_count,
                    fail_count: stats.fail_count,
                }
            })
            .collect()
    }
}

impl Clone for Box<dyn Inputs + Send + Sync> {
    fn clone(&self) -> Self {
        panic!("Cannot clone Inputs trait object")
    }
}
