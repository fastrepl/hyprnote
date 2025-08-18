use std::path::Path;

use anyhow::Result;
use similar::{ChangeTag, TextDiff};

pub async fn update_config_with_diff<F>(config_path: &Path, update_fn: F) -> Result<()>
where
    F: FnOnce(&mut owhisper_config::Config) -> Result<()>,
{
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let mut config =
        match owhisper_config::Config::new(Some(config_path.to_str().unwrap().to_string())) {
            Ok(config) => config,
            Err(_) => owhisper_config::Config::default(),
        };

    let original_json = serde_json::to_string_pretty(&config)?;
    update_fn(&mut config)?;
    config.schema =
        Some("https://raw.githubusercontent.com/fastrepl/owhisper/main/schema.json".to_string());

    let updated_json = serde_json::to_string_pretty(&config)?;

    if original_json != updated_json {
        serde_json::to_writer_pretty(
            std::fs::OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open(config_path)?,
            &config,
        )?;

        show_config_diff(&original_json, &updated_json, config_path.to_str().unwrap())?;
    }

    Ok(())
}

fn show_config_diff(original: &str, updated: &str, config_path: &str) -> Result<()> {
    let diff = TextDiff::from_lines(original, updated);

    let mut diff_output = String::new();
    diff_output.push_str(&format!("--- {} ---\n", config_path));

    let mut has_changes = false;
    for change in diff.iter_all_changes() {
        let prefix = match change.tag() {
            ChangeTag::Delete => {
                has_changes = true;
                "- "
            }
            ChangeTag::Insert => {
                has_changes = true;
                "+ "
            }
            ChangeTag::Equal => "  ",
        };
        diff_output.push_str(prefix);
        diff_output.push_str(change.value());
        if !change.value().ends_with('\n') {
            diff_output.push('\n');
        }
    }

    if has_changes {
        bat::PrettyPrinter::new()
            .input_from_bytes(diff_output.as_bytes())
            .grid(true)
            .header(false)
            .language("diff")
            .print()?;
    }

    Ok(())
}
