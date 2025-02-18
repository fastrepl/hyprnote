pub fn model_builder(data_dir: std::path::PathBuf) -> rwhisper::WhisperBuilder {
    let cache = kalosm_common::Cache::new(data_dir);
    rwhisper::WhisperBuilder::default().with_cache(cache)
}

pub fn make_progress_handler(
    on_progress: tauri::ipc::Channel<u8>,
) -> impl FnMut(rwhisper::ModelLoadingProgress) {
    move |progress| {
        let percentage = match progress {
            rwhisper::ModelLoadingProgress::Downloading { progress, .. } => {
                ((progress.progress as f32 / progress.size as f32) * 80.0) as u8
            }
            rwhisper::ModelLoadingProgress::Loading { progress } => {
                (80.0 + progress * 20.0) as u8
            }
        };
        let _ = on_progress.send(percentage);
    }
}
