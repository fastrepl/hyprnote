mod error;
pub use error::*;

use ort::{
    session::{builder::GraphOptimizationLevel, Session},
    Result,
};

pub use ndarray;
pub use ort;

pub fn load_model_from_bytes(bytes: &[u8]) -> Result<Session, Error> {
    Session::builder()
        .and_then(|builder| {
            log::debug!("Creating ORT session builder");
            builder.with_intra_threads(1)
        })
        .and_then(|builder| {
            log::debug!("Setting intra threads to 1");
            builder.with_inter_threads(1)
        })
        .and_then(|builder| {
            log::debug!("Setting inter threads to 1");
            builder.with_optimization_level(GraphOptimizationLevel::Level3)
        })
        .and_then(|builder| {
            log::debug!("Setting optimization level to Level3");
            builder.commit_from_memory(bytes)
        })
        .map_err(|e| {
            log::error!("Failed to load ONNX model from bytes: {:?}", e);
            Error::Ort(e)
        })
}

pub fn load_model_from_path(path: impl AsRef<std::path::Path>) -> Result<Session, Error> {
    let path = path.as_ref();
    log::debug!("Loading ONNX model from path: {:?}", path);
    
    let bytes = std::fs::read(path).map_err(|e| {
        log::error!("Failed to read model file at {:?}: {:?}", path, e);
        Error::ReadModelFromPath(e)
    })?;
    
    log::debug!("Successfully read {} bytes from model file", bytes.len());
    load_model_from_bytes(&bytes)
}
