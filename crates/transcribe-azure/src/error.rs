#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Service error: {0}")]
    ServiceError(String),
}
