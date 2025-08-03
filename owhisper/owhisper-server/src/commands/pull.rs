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

    let home_dir =
        dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?;
    let output_path = home_dir.join(".owhisper").join("models").join(filename);

    if output_path.exists() {
        let metadata = std::fs::metadata(&output_path)?;
        if metadata.len() == expected_size {
            log::info!("Model {} already downloaded", args.model);
            return Ok(());
        }
    }

    let progress = indicatif::ProgressBar::new(0);
    progress.set_style(
        indicatif::ProgressStyle::default_bar()
            .template("{msg} [{bar:40.cyan/blue}] {percent:>3}% {bytes}/{total_bytes}")
            .unwrap()
            .progress_chars("━━╸"),
    );

    hypr_file::download_file_parallel(url, output_path, |progress_update| match progress_update {
        hypr_file::DownloadProgress::Started => {
            progress.set_position(0);
        }
        hypr_file::DownloadProgress::Progress(downloaded, total) => {
            if progress.length().unwrap_or(0) != total {
                progress.set_length(total);
            }
            progress.set_position(downloaded);
        }
        hypr_file::DownloadProgress::Finished => {
            progress.finish_and_clear();
        }
    })
    .await?;

    log::info!("Try running 'owhisper run {}' to get started", args.model);
    Ok(())
}
