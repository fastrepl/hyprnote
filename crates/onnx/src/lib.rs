#[allow(unused_imports)]
use ort::execution_providers::{CoreMLExecutionProvider, DirectMLExecutionProvider};
use ort::{error::Result, session::Session};

pub use ort;

pub fn load_model(bytes: &[u8]) -> Result<Session> {
    let session = Session::builder()?
        .with_execution_providers([
            #[cfg(target_os = "windows")]
            DirectMLExecutionProvider::default().build(),
            #[cfg(target_os = "macos")]
            CoreMLExecutionProvider::default().build(),
        ])?
        .commit_from_memory(bytes)?;

    Ok(session)
}
