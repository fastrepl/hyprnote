pub fn model_builder(
    data_dir: std::path::PathBuf,
    source: kalosm_llama::LlamaSource,
) -> kalosm_llama::LlamaBuilder {
    let cache = kalosm_common::Cache::new(data_dir)
        .with_huggingface_token(Some("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".to_string()));

    kalosm_llama::LlamaBuilder::default()
        .with_flash_attn(true)
        .with_source(source.with_cache(cache))
}

pub fn make_progress_handler(
    on_progress: tauri::ipc::Channel<u8>,
) -> impl FnMut(kalosm_model_types::ModelLoadingProgress) {
    move |progress| {
        if let kalosm_model_types::ModelLoadingProgress::Downloading { progress, .. } = progress {
            let percentage = ((progress.progress as f32 / progress.size as f32) * 100.0) as u8;
            let _ = on_progress.send(percentage);
        }
    }
}
