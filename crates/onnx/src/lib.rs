#[allow(unused_imports)]
use ort::{
    error::Result,
    execution_providers::{CoreMLExecutionProvider, DirectMLExecutionProvider},
    session::{builder::GraphOptimizationLevel, Session},
};

pub use ort;

pub fn load_model(bytes: &[u8]) -> Result<Session> {
    let session = Session::builder()?
        .with_intra_threads(1)?
        .with_inter_threads(1)?
        .with_optimization_level(GraphOptimizationLevel::Level3)?
        .with_execution_providers([
            #[cfg(target_os = "windows")]
            DirectMLExecutionProvider::default().build(),
            #[cfg(target_os = "macos")]
            CoreMLExecutionProvider::default().build(),
        ])?
        .commit_from_memory(bytes)?;

    Ok(session)
}
