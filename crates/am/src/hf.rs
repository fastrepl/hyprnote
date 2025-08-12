use hf_hub::api::tokio::{ApiBuilder, Progress};
use hf_hub::{Cache, Repo, RepoType};
use std::sync::{Arc, Mutex};

use hypr_download_interface::DownloadProgress;

fn get_base_dir() -> Result<std::path::PathBuf, crate::Error> {
    let mut path = dirs::home_dir().ok_or(crate::Error::NoHomeDir)?;
    path.push("Library");
    path.push("Caches");
    path.push("com.fastrepl.hyprnote");
    path.push("hf");

    std::fs::create_dir_all(&path)?;
    Ok(path)
}

// Shared state for tracking overall progress
#[derive(Clone)]
struct ProgressTracker {
    total_bytes: u64,
    downloaded_bytes: Arc<Mutex<u64>>,
    file_progress: Arc<Mutex<std::collections::HashMap<String, u64>>>,
}

impl ProgressTracker {
    fn new(total_bytes: u64) -> Self {
        Self {
            total_bytes,
            downloaded_bytes: Arc::new(Mutex::new(0)),
            file_progress: Arc::new(Mutex::new(std::collections::HashMap::new())),
        }
    }

    fn update_file_progress(&self, file: &str, bytes: u64) -> (u64, u64) {
        let mut file_progress = self.file_progress.lock().unwrap();
        let old_progress = file_progress.get(file).copied().unwrap_or(0);
        file_progress.insert(file.to_string(), bytes);

        let mut downloaded = self.downloaded_bytes.lock().unwrap();
        // Use saturating operations to prevent overflow
        *downloaded = downloaded
            .saturating_sub(old_progress)
            .saturating_add(bytes);

        (*downloaded, self.total_bytes)
    }
}

// Wrapper struct to adapt the callback to the Progress trait
struct CallbackProgress<F> {
    callback: Arc<Mutex<F>>,
    tracker: ProgressTracker,
    current_file: String,
    current_size: usize,
    file_total_size: usize,
}

impl<F> CallbackProgress<F>
where
    F: FnMut(DownloadProgress),
{
    fn new(file: String, callback: Arc<Mutex<F>>, tracker: ProgressTracker) -> Self {
        Self {
            callback,
            tracker,
            current_file: file,
            current_size: 0,
            file_total_size: 0,
        }
    }
}

impl<F> Clone for CallbackProgress<F>
where
    F: Clone,
{
    fn clone(&self) -> Self {
        Self {
            callback: self.callback.clone(),
            tracker: self.tracker.clone(),
            current_file: self.current_file.clone(),
            current_size: self.current_size,
            file_total_size: self.file_total_size,
        }
    }
}

impl<F> Progress for CallbackProgress<F>
where
    F: FnMut(DownloadProgress) + Send + Sync + Clone,
{
    async fn init(&mut self, size: usize, _filename: &str) {
        self.file_total_size = size;
        self.current_size = 0;
    }

    async fn update(&mut self, size: usize) {
        self.current_size += size;
        let (downloaded, total) = self
            .tracker
            .update_file_progress(&self.current_file, self.current_size as u64);

        let mut callback = self.callback.lock().unwrap();
        (callback)(DownloadProgress::Progress(downloaded, total));
    }

    async fn finish(&mut self) {
        // File finished, but don't send Finished event here as we track overall progress
    }
}

// Helper to get file size by making a HEAD request
async fn get_file_size(
    api: &hf_hub::api::tokio::Api,
    repo: &hf_hub::api::tokio::ApiRepo,
    file_path: &str,
) -> Result<u64, crate::Error> {
    let url = repo.url(file_path);
    let response = api
        .client()
        .head(&url)
        .send()
        .await
        .map_err(|_| crate::Error::UnexpectedResponse)?;

    let size = response
        .headers()
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);

    Ok(size)
}

pub async fn download<F>(
    repo_name: impl Into<String>,
    dir_path: impl AsRef<std::path::Path>,
    mut progress: F,
) -> Result<Vec<(String, std::path::PathBuf)>, crate::Error>
where
    F: FnMut(DownloadProgress) + Send + Sync + Clone + 'static,
{
    let cache_dir = get_base_dir()?;
    let api = ApiBuilder::new()
        .with_cache_dir(cache_dir.clone())
        .with_max_files(1)
        .with_progress(false)
        .build()
        .map_err(|_e| crate::Error::UnexpectedResponse)?;

    let repo_name_str = repo_name.into();
    let repo = api.model(repo_name_str.clone());
    let info = repo
        .info()
        .await
        .map_err(|_e| crate::Error::UnexpectedResponse)?;

    let dir_path_str = dir_path.as_ref().to_string_lossy();
    let mut files_to_download = Vec::new();

    let cache = Cache::new(cache_dir.clone());
    let repo_cache = cache.repo(Repo::new(repo_name_str.clone(), RepoType::Model));

    for sibling in &info.siblings {
        let file_path = &sibling.rfilename;

        let should_download = if dir_path_str.is_empty() {
            // Download all files if dir_path is empty
            true
        } else if dir_path_str == "/" {
            // Root directory files only (no subdirectories)
            !file_path.contains('/')
        } else {
            // Download files in the specified directory
            file_path.starts_with(&format!("{}/", dir_path_str))
        };

        if should_download {
            // Check if file is already cached
            if repo_cache.get(file_path).is_none() {
                // Need to download this file
                files_to_download.push(file_path.clone());
            }
        }
    }

    // If no files need downloading, just return cached files
    if files_to_download.is_empty() {
        progress(DownloadProgress::Started);
        progress(DownloadProgress::Finished);

        let mut downloaded_files = Vec::new();
        for sibling in &info.siblings {
            let file_path = &sibling.rfilename;
            let should_include = if dir_path_str.is_empty() {
                true
            } else if dir_path_str == "/" {
                !file_path.contains('/')
            } else {
                file_path.starts_with(&format!("{}/", dir_path_str))
            };

            if should_include {
                if let Some(local_path) = repo_cache.get(file_path) {
                    downloaded_files.push((file_path.clone(), local_path));
                }
            }
        }
        return Ok(downloaded_files);
    }

    // Start overall download
    progress(DownloadProgress::Started);

    // Pre-calculate total size by making HEAD requests for all files
    let mut total_bytes = 0u64;
    for file_path in &files_to_download {
        let size = get_file_size(&api, &repo, file_path).await?;
        total_bytes += size;
    }

    // Create progress tracker with the pre-calculated total
    let tracker = ProgressTracker::new(total_bytes);
    let callback_mutex = Arc::new(Mutex::new(progress));

    let mut downloaded_files = Vec::new();

    // Download each file
    for file_path in &files_to_download {
        let file_callback =
            CallbackProgress::new(file_path.clone(), callback_mutex.clone(), tracker.clone());

        let local_path = repo
            .download_with_progress(file_path, file_callback)
            .await
            .map_err(|_e| crate::Error::UnexpectedResponse)?;

        downloaded_files.push((file_path.clone(), local_path));
    }

    // Also include already cached files in the result
    for sibling in &info.siblings {
        let file_path = &sibling.rfilename;
        let should_include = if dir_path_str.is_empty() {
            true
        } else if dir_path_str == "/" {
            !file_path.contains('/')
        } else {
            file_path.starts_with(&format!("{}/", dir_path_str))
        };

        if should_include && !files_to_download.contains(file_path) {
            if let Some(local_path) = repo_cache.get(file_path) {
                downloaded_files.push((file_path.clone(), local_path));
            }
        }
    }

    // Send final finished event
    let mut final_callback = callback_mutex.lock().unwrap();
    (final_callback)(DownloadProgress::Finished);

    Ok(downloaded_files)
}

pub async fn is_folder_downloaded(repo_name: &str, dir_path: &str) -> Result<bool, crate::Error> {
    let cache_dir = get_base_dir()?;
    let api = ApiBuilder::new()
        .with_cache_dir(cache_dir.clone())
        .with_progress(false)
        .build()
        .map_err(|_| crate::Error::UnexpectedResponse)?;

    let repo = api.model(repo_name.to_string());
    let info = repo
        .info()
        .await
        .map_err(|_| crate::Error::UnexpectedResponse)?;

    let cache = Cache::new(cache_dir);
    let repo_cache = cache.repo(Repo::new(repo_name.to_string(), RepoType::Model));

    for sibling in &info.siblings {
        let file_path = &sibling.rfilename;

        let should_check = if dir_path.is_empty() {
            true
        } else if dir_path == "/" {
            !file_path.contains('/')
        } else {
            file_path.starts_with(&format!("{}/", dir_path))
        };

        if should_check {
            if repo_cache.get(file_path).is_none() {
                return Ok(false);
            }
        }
    }

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::sync::Mutex;

    #[tokio::test]
    // cargo test -p am test_download -- --nocapture
    async fn test_download() {
        let last_progress = Arc::new(Mutex::new(0u64));
        let downloaded_files = download(
            "argmaxinc/whisperkit-coreml",
            "openai_whisper-small.en_217MB",
            move |progress| match progress {
                DownloadProgress::Started => println!("Download started"),
                DownloadProgress::Progress(current, total) => {
                    let mut last = last_progress.lock().unwrap();
                    // Use saturating_sub to prevent underflow
                    let diff = current.saturating_sub(*last);
                    // Only print significant progress updates
                    if diff > 10_000_000 || current == total {
                        let percentage = if total > 0 {
                            (current as f64 / total as f64 * 100.0).min(100.0)
                        } else {
                            0.0
                        };
                        println!("Progress: {:.1}% ({}/{})", percentage, current, total);
                        *last = current;
                    }
                }
                DownloadProgress::Finished => println!("Download finished"),
            },
        )
        .await
        .unwrap();

        println!("Downloaded {} files", downloaded_files.len());
    }
}
