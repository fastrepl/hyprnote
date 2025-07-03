use futures_util::Stream;

pub struct StreamSource<S> {
    stream: S,
    sample_rate: u32,
}

impl<S> StreamSource<S>
where
    S: Stream<Item = f32> + Unpin,
{
    pub fn new(stream: S, sample_rate: u32) -> Self {
        Self {
            stream,
            sample_rate,
        }
    }
}

impl<S> kalosm_sound::AsyncSource for StreamSource<S>
where
    S: Stream<Item = f32> + Unpin,
{
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        &mut self.stream
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}
