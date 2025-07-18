use ort::{
    logging::LogLevel,
    session::{builder::GraphOptimizationLevel, Session},
    Result,
};

pub use ndarray;
pub use ort;

pub fn load_model(bytes: &[u8]) -> Result<Session> {
    let session = Session::builder()?
        .with_log_level(LogLevel::Error)?
        .with_intra_threads(1)?
        .with_inter_threads(1)?
        .with_optimization_level(GraphOptimizationLevel::Level3)?
        .commit_from_memory(bytes)?;

    Ok(session)
}
