mod argmax;
mod deepgram;

pub use argmax::*;
pub use deepgram::*;

pub trait SttAdapter: Clone + Default + Send + Sync + 'static {
    fn supports_native_multichannel(&self) -> bool;
}
