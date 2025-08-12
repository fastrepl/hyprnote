use std::sync::Arc;
use tokio::task::JoinSet;

use clap::Parser;
use indicatif::{MultiProgress, ProgressBar, ProgressStyle};

use owhisper_model::Model;

#[derive(Parser)]
pub struct PullArgs {
    #[arg(value_enum)]
    pub model: Model,
}

pub async fn handle_pull(args: PullArgs) -> anyhow::Result<()> {
    let assets = args.model.assets();
    let model_dir = owhisper_config::models_dir().join(args.model.to_string());
    std::fs::create_dir_all(&model_dir)?;

    let mut to_download = Vec::new();
    for asset in &assets {
        let asset_path = model_dir.join(&asset.name);
        if asset_path.exists() {
            let metadata = std::fs::metadata(&asset_path)?;
            if metadata.len() == asset.size {
                continue;
            }
        }
        to_download.push((asset.clone(), asset_path));
    }

    if to_download.is_empty() {
        if let Err(e) = args.model.verify(&model_dir) {
            std::fs::remove_dir_all(&model_dir).ok();
            log::error!("Model {} already downloaded, but corrupted", args.model);
            return Err(e.into());
        } else {
            log::info!("Model {} already downloaded", args.model);
            return Ok(());
        }
    }

    let multi_progress = Arc::new(MultiProgress::new());

    let max_name_len = to_download
        .iter()
        .map(|(asset, _)| asset.name.len())
        .max()
        .unwrap_or(20)
        .max(20);

    let template = format!(
        "{{msg:{max_name_len}}} [{{bar:40.cyan/blue}}] {{percent:>3}}% {{bytes}}/{{total_bytes}} {{bytes_per_sec}}"
    );

    let style = ProgressStyle::default_bar()
        .template(&template)
        .unwrap()
        .progress_chars("━━╸");

    let mut tasks = JoinSet::new();

    for (asset, asset_path) in to_download {
        let pb = multi_progress.add(ProgressBar::new(0));
        pb.set_style(style.clone());
        pb.set_message(asset.name.clone());

        let mp = multi_progress.clone();
        tasks.spawn(async move {
            let result = hypr_file::download_file_parallel(
                asset.url.clone(),
                &asset_path,
                |progress_update| match progress_update {
                    hypr_download_interface::DownloadProgress::Started => {
                        pb.set_position(0);
                    }
                    hypr_download_interface::DownloadProgress::Progress(downloaded, total) => {
                        if pb.length().unwrap_or(0) != total {
                            pb.set_length(total);
                        }
                        pb.set_position(downloaded);
                    }
                    hypr_download_interface::DownloadProgress::Finished => {
                        pb.finish_with_message(format!("✓ {}", asset.name));
                    }
                },
            )
            .await;

            if let Err(e) = &result {
                pb.finish_with_message(format!("✗ {} - {}", asset.name, e));
                mp.println(format!("Failed to download {}: {}", asset.name, e))
                    .ok();
            }

            result.map(|_| (asset.name, asset_path))
        });
    }

    let mut downloaded_assets = Vec::new();
    while let Some(result) = tasks.join_next().await {
        match result {
            Ok(Ok((name, path))) => downloaded_assets.push((name, path)),
            Ok(Err(e)) => return Err(e.into()),
            Err(e) => return Err(anyhow::anyhow!("Task failed: {}", e)),
        }
    }

    multi_progress.clear().ok();

    if let Err(e) = args.model.verify(&model_dir) {
        log::warn!("Failed to verify model {}", args.model);
        std::fs::remove_dir_all(&model_dir).ok();
        return Err(e.into());
    }

    if !downloaded_assets.is_empty() {
        let config_path = owhisper_config::global_config_path();

        crate::update_config_with_diff(&config_path, |config| {
            let model_id = args.model.to_string();
            let assets_dir = model_dir.to_str().unwrap().to_string();

            let new_model = match args.model {
                owhisper_model::Model::WhisperCppBaseQ8
                | owhisper_model::Model::WhisperCppBaseQ8En
                | owhisper_model::Model::WhisperCppTinyQ8
                | owhisper_model::Model::WhisperCppTinyQ8En
                | owhisper_model::Model::WhisperCppSmallQ8
                | owhisper_model::Model::WhisperCppSmallQ8En
                | owhisper_model::Model::WhisperCppLargeTurboQ8 => {
                    owhisper_config::ModelConfig::WhisperCpp(
                        owhisper_config::WhisperCppModelConfig {
                            id: model_id.clone(),
                            assets_dir,
                        },
                    )
                }
                owhisper_model::Model::MoonshineOnnxTiny
                | owhisper_model::Model::MoonshineOnnxTinyQ4
                | owhisper_model::Model::MoonshineOnnxTinyQ8 => {
                    owhisper_config::ModelConfig::Moonshine(owhisper_config::MoonshineModelConfig {
                        id: model_id.clone(),
                        size: owhisper_config::MoonshineModelSize::Tiny,
                        assets_dir,
                    })
                }
                owhisper_model::Model::MoonshineOnnxBase
                | owhisper_model::Model::MoonshineOnnxBaseQ4
                | owhisper_model::Model::MoonshineOnnxBaseQ8 => {
                    owhisper_config::ModelConfig::Moonshine(owhisper_config::MoonshineModelConfig {
                        id: model_id.clone(),
                        size: owhisper_config::MoonshineModelSize::Base,
                        assets_dir,
                    })
                }
            };

            let model_exists = config.models.iter().position(|m| m.id() == model_id);

            if let Some(index) = model_exists {
                config.models[index] = new_model;
            } else {
                config.models.push(new_model);
            }

            Ok(())
        })
        .await?;
    }

    log::info!("Try running 'owhisper run {}' to get started", args.model);
    Ok(())
}
