use futures_util::Stream;
use tokio::sync::mpsc::Receiver;
use tokio_stream::wrappers::ReceiverStream;

pub struct ReceiverStreamSource {
    stream: ReceiverStream<f32>,
    sample_rate: u32,
}

impl ReceiverStreamSource {
    pub fn new(rx: Receiver<f32>, sample_rate: u32) -> Self {
        Self {
            stream: ReceiverStream::new(rx),
            sample_rate,
        }
    }
}

impl kalosm_sound::AsyncSource for ReceiverStreamSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        &mut self.stream
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}
