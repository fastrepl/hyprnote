use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use rayon::prelude::*;

use crate::{
    ChatCompleter, ClientError, GraderType, OpenRouterClient, Score, Task, Usage, UsageResolver,
    parse_config,
};

const DEFAULT_GRADER_MODEL: &str = "openai/gpt-4.1-nano";

pub static DEFAULT_MODELS: &[&str] = &[
    "openai/gpt-4.1-nano",
    "anthropic/claude-haiku-4.5",
    "liquid/lfm-2.2-6b",
];

#[derive(Debug, Clone, Default)]
pub struct Result {
    pub name: String,
    pub model: String,
    pub run_num: i32,
    pub output: String,
    pub scores: Vec<Score>,
    pub error: String,
    pub generation_id: String,
    pub usage: Usage,
}

impl Result {
    pub fn all_passed(&self) -> bool {
        if !self.error.is_empty() {
            return false;
        }
        self.scores.iter().all(|s| s.passed)
    }

    pub fn tally_score(&self) -> (i32, i32) {
        let total = self.scores.len() as i32;
        let passed = self.scores.iter().filter(|s| s.passed).count() as i32;
        (passed, total)
    }
}

#[derive(Debug, Clone, Default)]
pub struct ProgressInfo {
    pub generations_complete: usize,
    pub generations_total: usize,
    pub evaluations_complete: usize,
    pub evaluations_total: usize,
}

pub type ProgressCallback = Box<dyn Fn(ProgressInfo) + Send + Sync>;

pub struct Runner {
    client: Arc<dyn ChatCompleter>,
    target_models: Vec<String>,
    grader_model: String,
    num_evals: i32,
    timeout: Duration,
    concurrency: usize,
    on_progress: Option<ProgressCallback>,
}

pub struct RunnerBuilder {
    client: Option<Arc<dyn ChatCompleter>>,
    target_models: Option<Vec<String>>,
    grader_model: Option<String>,
    num_evals: Option<i32>,
    timeout: Option<Duration>,
    concurrency: Option<usize>,
}

impl Default for RunnerBuilder {
    fn default() -> Self {
        Self {
            client: None,
            target_models: None,
            grader_model: None,
            num_evals: None,
            timeout: None,
            concurrency: None,
        }
    }
}

impl RunnerBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn client(mut self, client: Arc<dyn ChatCompleter>) -> Self {
        self.client = Some(client);
        self
    }

    pub fn models(mut self, models: Vec<String>) -> Self {
        self.target_models = Some(models);
        self
    }

    pub fn grader_model(mut self, model: String) -> Self {
        self.grader_model = Some(model);
        self
    }

    pub fn num_evals(mut self, n: i32) -> Self {
        self.num_evals = Some(n);
        self
    }

    pub fn timeout(mut self, d: Duration) -> Self {
        self.timeout = Some(d);
        self
    }

    pub fn concurrency(mut self, n: usize) -> Self {
        self.concurrency = Some(n);
        self
    }

    pub fn build(self) -> Runner {
        let cfg = parse_config();

        let num_evals = self
            .num_evals
            .unwrap_or_else(|| if cfg.num_evals <= 0 { 1 } else { cfg.num_evals });

        let client = self
            .client
            .unwrap_or_else(|| Arc::new(OpenRouterClient::new(cfg.openrouter_api_key.clone())));

        Runner {
            client,
            target_models: self
                .target_models
                .unwrap_or_else(|| DEFAULT_MODELS.iter().map(|s| s.to_string()).collect()),
            grader_model: self
                .grader_model
                .unwrap_or_else(|| DEFAULT_GRADER_MODEL.to_string()),
            num_evals,
            timeout: self.timeout.unwrap_or(cfg.timeout()),
            concurrency: self.concurrency.unwrap_or(cfg.concurrency),
            on_progress: None,
        }
    }
}

impl Runner {
    pub fn new() -> Self {
        RunnerBuilder::new().build()
    }

    pub fn builder() -> RunnerBuilder {
        RunnerBuilder::new()
    }

    pub fn set_on_progress(&mut self, callback: ProgressCallback) {
        self.on_progress = Some(callback);
    }

    pub fn total_count(&self, tasks: &[Task]) -> usize {
        self.target_models.len() * tasks.len() * self.num_evals as usize
    }

    pub fn total_generations(&self, tasks: &[Task]) -> usize {
        let mut total = 0;
        for task in tasks {
            let samples = if task.samples <= 1 { 1 } else { task.samples };
            total += samples as usize;
        }
        total * self.target_models.len() * self.num_evals as usize
    }

    pub fn total_evaluations(&self, tasks: &[Task]) -> usize {
        let mut total = 0;
        for task in tasks {
            let task_samples = if task.samples <= 1 { 1 } else { task.samples };

            for rubric in &task.rubrics {
                let eval_count = match &rubric.grader {
                    GraderType::Llm { samples } => {
                        let grader_samples = if *samples <= 1 { 1 } else { *samples };
                        task_samples * grader_samples
                    }
                    _ => task_samples,
                };
                total += eval_count as usize;
            }
        }
        total * self.target_models.len() * self.num_evals as usize
    }

    pub fn run(&self, tasks: &[Task]) -> Vec<Result> {
        let generations_total = self.total_generations(tasks);
        let evaluations_total = self.total_evaluations(tasks);

        let generations_done = Arc::new(AtomicUsize::new(0));
        let evaluations_done = Arc::new(AtomicUsize::new(0));
        let results = Arc::new(Mutex::new(Vec::new()));

        let pool = rayon::ThreadPoolBuilder::new()
            .num_threads(self.concurrency)
            .build()
            .unwrap();

        let work_items: Vec<_> = self
            .target_models
            .iter()
            .flat_map(|model| {
                tasks.iter().flat_map(move |task| {
                    (0..self.num_evals).map(move |i| (model.clone(), task.clone(), i))
                })
            })
            .collect();

        pool.install(|| {
            work_items.par_iter().for_each(|(model, task, run_num)| {
                let result = self.run_single_with_progress(
                    model,
                    *run_num,
                    task,
                    &generations_done,
                    &evaluations_done,
                    generations_total,
                    evaluations_total,
                );

                if let Ok(mut results_guard) = results.lock() {
                    results_guard.push(result);
                }
            });
        });

        Arc::try_unwrap(results)
            .unwrap_or_else(|_| Mutex::new(Vec::new()))
            .into_inner()
            .unwrap_or_default()
    }

    fn run_single_with_progress(
        &self,
        model: &str,
        run_num: i32,
        task: &Task,
        generations_done: &AtomicUsize,
        evaluations_done: &AtomicUsize,
        generations_total: usize,
        evaluations_total: usize,
    ) -> Result {
        let mut result = Result {
            name: task.name.clone(),
            model: model.to_string(),
            run_num,
            ..Default::default()
        };

        let task_samples = if task.samples <= 1 { 1 } else { task.samples };

        let expected_evals: i32 = task
            .rubrics
            .iter()
            .map(|rubric| match &rubric.grader {
                GraderType::Llm { samples } => {
                    let grader_samples = if *samples <= 1 { 1 } else { *samples };
                    task_samples * grader_samples
                }
                _ => task_samples,
            })
            .sum();

        let report_progress = |gens: usize, evals: usize| {
            if let Some(ref cb) = self.on_progress {
                cb(ProgressInfo {
                    generations_complete: gens,
                    generations_total,
                    evaluations_complete: evals,
                    evaluations_total,
                });
            }
        };

        if task.samples > 1 {
            match task.execute_multi_with_generation_id(self.client.as_ref(), model) {
                Ok((outputs, generation_id)) => {
                    result.generation_id = generation_id;

                    for _ in 0..task_samples {
                        generations_done.fetch_add(1, Ordering::SeqCst);
                    }
                    report_progress(
                        generations_done.load(Ordering::SeqCst),
                        evaluations_done.load(Ordering::SeqCst),
                    );

                    if !outputs.is_empty() {
                        result.output = outputs[0].clone();
                    }

                    let on_eval = || {
                        evaluations_done.fetch_add(1, Ordering::SeqCst);
                        report_progress(
                            generations_done.load(Ordering::SeqCst),
                            evaluations_done.load(Ordering::SeqCst),
                        );
                    };

                    result.scores = task.grade_multi_with_progress(
                        self.client.as_ref(),
                        &self.grader_model,
                        &outputs,
                        Some(&on_eval),
                    );
                }
                Err(e) => {
                    result.error = e.to_string();
                    for _ in 0..task_samples {
                        generations_done.fetch_add(1, Ordering::SeqCst);
                    }
                    for _ in 0..expected_evals {
                        evaluations_done.fetch_add(1, Ordering::SeqCst);
                    }
                    report_progress(
                        generations_done.load(Ordering::SeqCst),
                        evaluations_done.load(Ordering::SeqCst),
                    );
                }
            }
        } else {
            match task.execute_with_generation_id(self.client.as_ref(), model) {
                Ok((output, generation_id)) => {
                    result.generation_id = generation_id;
                    result.output = output.clone();

                    generations_done.fetch_add(1, Ordering::SeqCst);
                    report_progress(
                        generations_done.load(Ordering::SeqCst),
                        evaluations_done.load(Ordering::SeqCst),
                    );

                    let on_eval = || {
                        evaluations_done.fetch_add(1, Ordering::SeqCst);
                        report_progress(
                            generations_done.load(Ordering::SeqCst),
                            evaluations_done.load(Ordering::SeqCst),
                        );
                    };

                    result.scores = task.grade_with_progress(
                        self.client.as_ref(),
                        &self.grader_model,
                        &output,
                        Some(&on_eval),
                    );
                }
                Err(e) => {
                    result.error = e.to_string();
                    generations_done.fetch_add(1, Ordering::SeqCst);
                    for _ in 0..expected_evals {
                        evaluations_done.fetch_add(1, Ordering::SeqCst);
                    }
                    report_progress(
                        generations_done.load(Ordering::SeqCst),
                        evaluations_done.load(Ordering::SeqCst),
                    );
                }
            }
        }

        result
    }
}

impl Default for Runner {
    fn default() -> Self {
        Self::new()
    }
}
