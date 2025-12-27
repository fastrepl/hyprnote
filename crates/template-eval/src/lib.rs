mod filters;

pub use filters::*;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    AskamaError(#[from] askama::Error),
}
