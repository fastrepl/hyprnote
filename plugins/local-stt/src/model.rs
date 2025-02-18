pub fn model_builder(data_dir: std::path::PathBuf) -> rwhisper::WhisperBuilder {
    let cache = kalosm_common::Cache::new(data_dir)
        .with_huggingface_token(Some("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".to_string()));

    rwhisper::WhisperBuilder::default().with_cache(cache)
}

pub fn make_progress_handler(
    on_progress: tauri::ipc::Channel<u8>,
) -> impl FnMut(rwhisper::ModelLoadingProgress) {
    move |progress| {
        if let rwhisper::ModelLoadingProgress::Downloading { progress, .. } = progress {
            let percentage = ((progress.progress as f32 / progress.size as f32) * 100.0) as u8;
            let _ = on_progress.send(percentage);
        }
    }
}
