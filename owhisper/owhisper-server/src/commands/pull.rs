use clap::Parser;

use hypr_whisper_local_model::WhisperModel;

#[derive(Parser)]
pub struct PullArgs {
    /// The Whisper model to download
    #[arg(value_enum)]
    pub model: WhisperModel,
}

pub async fn handle_pull(args: PullArgs) -> anyhow::Result<()> {
    let url = args.model.model_url();
    let expected_size = args.model.model_size();
    let filename = args.model.file_name();

    // Store models in user's home directory under .owhisper/models
    let home_dir =
        dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?;
    let output_path = home_dir.join(".owhisper").join("models").join(filename);

    // Check if file already exists with correct size
    if output_path.exists() {
        let metadata = std::fs::metadata(&output_path)?;
        if metadata.len() == expected_size {
            println!("Model {} already downloaded", args.model);
            return Ok(());
        }
    }

    // Create a progress bar with unknown length initially
    let progress = indicatif::ProgressBar::new(0);
    progress.set_style(
        indicatif::ProgressStyle::default_bar()
            .template(
                "{msg} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({eta})",
            )
            .unwrap()
            .progress_chars("=> "),
    );
    progress.set_message(format!("Downloading {}", args.model));

    // Download the file with progress tracking
    hypr_file::download_file_parallel(url, output_path, |progress_update| {
        match progress_update {
            hypr_file::DownloadProgress::Started => {
                progress.set_position(0);
            }
            hypr_file::DownloadProgress::Progress(downloaded, total) => {
                // Update the total length if we haven't set it yet
                if progress.length().unwrap_or(0) != total {
                    progress.set_length(total);
                }
                progress.set_position(downloaded);
            }
            hypr_file::DownloadProgress::Finished => {
                progress.finish_with_message("Download complete");
            }
        }
    })
    .await?;

    Ok(())
}
