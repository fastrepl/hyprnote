use futures::stream::StreamExt;
use serde::Serialize;
use std::{path::Path, path::PathBuf, process::Command};
use tauri::ipc::Channel;

pub struct Model {
    pub name: String,
    pub local_path: String,
    pub remote_url: String,
}

// https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin
impl Model {
    pub fn new(name: &str, local_path: &str, remote_url: &str) -> Self {
        Self {
            name: name.to_string(),
            local_path: local_path.to_string(),
            remote_url: remote_url.to_string(),
        }
    }

    pub fn exists(&self) -> bool {
        Path::new(&self.local_path).exists()
    }
}

#[derive(Serialize, specta::Type)]
pub enum DownloadError {
    RequestFailed,
    StreamInterrupted,
}

#[derive(Serialize, specta::Type, Default)]
pub struct DownloadEvent {
    bytes_downloaded: u64,
    bytes_total: u64,
    percent: f64,
    error: Option<DownloadError>,
}

#[tauri::command]
pub async fn download_model(model: Model, on_event: Channel<DownloadEvent>) {
    let response = match reqwest::get(&model.remote_url).await {
        Ok(resp) if resp.status().is_success() => resp,
        _ => {
            let _ = on_event.send(DownloadEvent {
                error: Some(DownloadError::RequestFailed),
                ..Default::default()
            });
            return;
        }
    };

    let bytes_total = response.content_length().unwrap_or(0);
    let mut bytes_downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                bytes_downloaded += bytes.len() as u64;
                let percent = (bytes_downloaded as f64 / bytes_total as f64) * 100.0;

                let _ = on_event.send(DownloadEvent {
                    bytes_downloaded,
                    bytes_total,
                    percent,
                    error: None,
                });
            }
            Err(_) => {
                let _ = on_event.send(DownloadEvent {
                    bytes_downloaded,
                    bytes_total,
                    percent: (bytes_downloaded as f64 / bytes_total as f64) * 100.0,
                    error: Some(DownloadError::StreamInterrupted),
                });
                break;
            }
        }
    }

    let _ = on_event.send(DownloadEvent {
        bytes_downloaded,
        bytes_total,
        percent: 100.0,
        error: None,
    });
}

// https://github.com/CapSoftware/Cap/blob/5a9f72a076041a7095409fe7a2b0f303239698b1/apps/desktop/src-tauri/src/lib.rs#L769
#[tauri::command]
#[specta::specta]
pub async fn open_path(path: PathBuf) -> Result<(), String> {
    let path_str = path.to_str().ok_or("Invalid path")?;

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", path_str])
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(path_str)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(
                path.parent()
                    .ok_or("Invalid path")?
                    .to_str()
                    .ok_or("Invalid path")?,
            )
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}
