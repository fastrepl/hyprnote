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

    let model_path = owhisper_config::Config::base()
        .join("models")
        .join(filename);

    if model_path.exists() {
        let metadata = std::fs::metadata(&model_path)?;
        if metadata.len() == expected_size {
            log::info!("Model {} already downloaded", args.model);
            return Ok(());
        }
    }

    {
        let progress = indicatif::ProgressBar::new(0);
        progress.set_style(
            indicatif::ProgressStyle::default_bar()
                .template("{msg} [{bar:40.cyan/blue}] {percent:>3}% {bytes}/{total_bytes}")
                .unwrap()
                .progress_chars("━━╸"),
        );

        hypr_file::download_file_parallel(
            url,
            &model_path,
            |progress_update| match progress_update {
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
            },
        )
        .await?;
    }

    {
        let config_path = owhisper_config::Config::global_config_path();
        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut global_config =
            match owhisper_config::Config::new(Some(config_path.to_str().unwrap().to_string())) {
                Ok(config) => config,
                Err(_) => {
                    log::info!("Creating new config file at {:?}", config_path);
                    owhisper_config::Config::default()
                }
            };

        let model_id = args.model.to_string();
        let model_exists = global_config.models.iter().position(|m| match m {
            owhisper_config::ModelConfig::WhisperCpp(wc_config) => wc_config.id == model_id,
            _ => false,
        });

        let new_model =
            owhisper_config::ModelConfig::WhisperCpp(owhisper_config::WhisperCppModelConfig {
                id: model_id.clone(),
                model_path: model_path.to_str().unwrap().to_string(),
            });

        if let Some(index) = model_exists {
            log::info!("Updating existing model '{}' configuration", model_id);
            global_config.models[index] = new_model;
        } else {
            log::info!("Adding new model '{}' to configuration", model_id);
            global_config.models.push(new_model);
        }

        serde_json::to_writer_pretty(
            std::fs::OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .open(&config_path)?,
            &global_config,
        )?;
    }

    log::info!("Try running 'owhisper run {}' to get started", args.model);
    Ok(())
}
