mod batch;
mod controller;
mod listener;
mod processor;
mod recorder;
mod source;

pub use batch::*;
pub use controller::*;
pub use listener::*;
pub use processor::*;
pub use recorder::*;
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
