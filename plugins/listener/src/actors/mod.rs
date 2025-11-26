mod listener;
mod recorder;
mod source;

pub use listener::*;
pub use recorder::*;
pub use source::*;

#[cfg(target_os = "macos")]
pub const SAMPLE_RATE: u32 = 16 * 1000;
#[cfg(not(target_os = "macos"))]
pub const SAMPLE_RATE: u32 = 16 * 1000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChannelMode {
    Single,
    Dual,
}

#[derive(Clone)]
pub struct AudioChunk {
    pub data: Vec<f32>,
}
