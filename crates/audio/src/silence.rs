use crate::source::AsyncSource;

pub fn silence() -> impl AsyncSource {
    Silence::new(44100)
}

struct Silence {
    sample_rate: u32,
}

impl Silence {
    pub fn new(sample_rate: u32) -> Self {
        Self { sample_rate }
    }
}

impl AsyncSource for Silence {
    fn as_stream(&mut self) -> impl futures_core::Stream<Item = f32> {
        futures_util::stream::repeat(0.0)
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}
