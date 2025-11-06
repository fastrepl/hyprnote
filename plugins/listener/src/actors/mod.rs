mod batch;
mod listener;
mod processor;
mod recorder;
mod session;
mod source;

pub use batch::*;
pub use listener::*;
pub use processor::*;
pub use recorder::*;
pub use session::*;
pub use source::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChannelMode {
    Single,
    Dual,
}

#[derive(Clone)]
pub struct AudioChunk {
    data: Vec<f32>,
}
