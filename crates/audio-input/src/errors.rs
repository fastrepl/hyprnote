#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("no input device found")]
    NoInputDevice,
}
