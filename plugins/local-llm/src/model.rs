pub fn model_builder(
    app_dir: std::path::PathBuf,
    source: kalosm_llama::LlamaSource,
) -> kalosm_llama::LlamaBuilder {
    let cache = kalosm_common::Cache::new(app_dir.join("cache"));

    kalosm_llama::LlamaBuilder::default()
        .with_flash_attn(true)
        .with_source(source.with_cache(cache))
}

pub fn make_progress_handler(
    on_progress: tauri::ipc::Channel<u8>,
) -> impl FnMut(kalosm_model_types::ModelLoadingProgress) {
    move |progress| {
        let percentage = match progress {
            kalosm_model_types::ModelLoadingProgress::Downloading { .. } => 0,
            kalosm_model_types::ModelLoadingProgress::Loading { .. } => 100,
        };
        let _ = on_progress.send(percentage);
    }
}
