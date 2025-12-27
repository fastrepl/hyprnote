use std::process::ExitCode;
use std::sync::Arc;

use clap::{Parser, Subcommand};
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};

mod report;

use hypr_eval::{OpenRouterClient, ProgressInfo, Runner, Task, parse_config};
use report::{render_json, render_results};

static DEFAULT_MODELS: &[&str] = &[
    "openai/gpt-4.1-nano",
    "anthropic/claude-haiku-4.5",
    "liquid/lfm-2.2-6b",
];

#[derive(Parser)]
#[command(name = "evals")]
#[command(about = "LLM evaluation runner")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Run {
        #[arg(short, long, value_delimiter = ',')]
        tasks: Option<Vec<String>>,

        #[arg(short, long, default_value = "table")]
        output: String,

        #[arg(short, long, value_delimiter = ',')]
        models: Option<Vec<String>>,

        #[arg(long)]
        no_cache: bool,

        #[arg(long)]
        cache_dir: Option<String>,
    },
    List,
    Completion {
        #[arg(value_enum)]
        shell: Shell,
    },
}

#[derive(Clone, Copy, PartialEq, Eq, clap::ValueEnum)]
enum Shell {
    Bash,
    Zsh,
    Fish,
    PowerShell,
}

fn main() -> ExitCode {
    let cli = Cli::parse();

    match cli.command {
        Commands::Run {
            tasks,
            output,
            models,
            no_cache,
            cache_dir,
        } => {
            if let Err(e) = run_evals(tasks, output, models, no_cache, cache_dir) {
                eprintln!("Error: {}", e);
                return ExitCode::FAILURE;
            }
        }
        Commands::List => {
            list_tasks();
        }
        Commands::Completion { shell } => {
            generate_completion(shell);
        }
    }

    ExitCode::SUCCESS
}

fn run_evals(
    task_filter: Option<Vec<String>>,
    output_format: String,
    model_override: Option<Vec<String>>,
    no_cache: bool,
    cache_dir: Option<String>,
) -> Result<(), String> {
    let cfg = parse_config();

    if cfg.openrouter_api_key.is_empty() {
        return Err("OPENROUTER_API_KEY environment variable is not set".to_string());
    }

    let all_tasks = hypr_eval::tasks::all_tasks();
    let selected_tasks = filter_tasks(&all_tasks, task_filter.as_deref());

    if selected_tasks.is_empty() {
        return Err("no tasks matched the filter".to_string());
    }

    let cache_dir_opt = if no_cache { None } else { cache_dir };
    let client = Arc::new(OpenRouterClient::with_cache_dir(
        cfg.openrouter_api_key.clone(),
        cache_dir_opt,
    ));

    let models =
        model_override.unwrap_or_else(|| DEFAULT_MODELS.iter().map(|s| s.to_string()).collect());

    let mut runner = Runner::builder()
        .client(client.clone())
        .models(models)
        .build();

    if output_format == "json" {
        let mut results = runner.run(&selected_tasks);
        resolve_usage(&client, &mut results);
        return render_json(&results).map_err(|e| e.to_string());
    }

    let gen_total = runner.total_generations(&selected_tasks);
    let eval_total = runner.total_evaluations(&selected_tasks);

    let multi = MultiProgress::new();
    let style = ProgressStyle::default_bar()
        .template("{prefix:>12} [{bar:30.white}] {pos}/{len}")
        .unwrap()
        .progress_chars("=> ");

    let gen_bar = multi.add(ProgressBar::new(gen_total as u64));
    gen_bar.set_style(style.clone());
    gen_bar.set_prefix("Generations");

    let eval_bar = multi.add(ProgressBar::new(eval_total as u64));
    eval_bar.set_style(style);
    eval_bar.set_prefix("Evaluations");

    let gen_bar_clone = gen_bar.clone();
    let eval_bar_clone = eval_bar.clone();

    runner.set_on_progress(Box::new(move |info: ProgressInfo| {
        gen_bar_clone.set_position(info.generations_complete as u64);
        eval_bar_clone.set_position(info.evaluations_complete as u64);
    }));

    let mut results = runner.run(&selected_tasks);

    gen_bar.finish();
    eval_bar.finish();

    resolve_usage(&client, &mut results);

    render_results(&results).map_err(|e| e.to_string())
}

fn filter_tasks(all_tasks: &[Task], filter: Option<&[String]>) -> Vec<Task> {
    match filter {
        None => all_tasks.to_vec(),
        Some(filter) => {
            let filter_set: std::collections::HashSet<String> =
                filter.iter().map(|s| s.to_lowercase()).collect();
            all_tasks
                .iter()
                .filter(|t| filter_set.contains(&t.name.to_lowercase()))
                .cloned()
                .collect()
        }
    }
}

fn resolve_usage(client: &OpenRouterClient, results: &mut [hypr_eval::Result]) {
    use hypr_eval::UsageResolver;

    for result in results.iter_mut() {
        if result.generation_id.is_empty() || !result.error.is_empty() {
            continue;
        }

        if let Ok(usage) = client.get_generation_usage(&result.generation_id) {
            result.usage = usage;
        }
    }
}

fn list_tasks() {
    for task in hypr_eval::tasks::all_tasks() {
        println!("{}", task.name);
        for rubric in &task.rubrics {
            println!("  - {}: {}", rubric.name, rubric.description);
        }
    }
}

fn generate_completion(shell: Shell) {
    use clap::CommandFactory;
    use clap_complete::{Shell as ClapShell, generate};

    let mut cmd = Cli::command();
    let shell = match shell {
        Shell::Bash => ClapShell::Bash,
        Shell::Zsh => ClapShell::Zsh,
        Shell::Fish => ClapShell::Fish,
        Shell::PowerShell => ClapShell::PowerShell,
    };
    generate(shell, &mut cmd, "evals", &mut std::io::stdout());
}
