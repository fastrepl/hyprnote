use futures_util::Stream;

pub trait AsyncSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_;

    fn sample_rate(&self) -> u32;
}

impl<S: rodio::Source> AsyncSource for S
where
    <S as Iterator>::Item: rodio::Sample + dasp::sample::ToSample<f32>,
{
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        let channels = self.channels() as usize;
        futures_util::stream::iter(self.by_ref().step_by(channels).map(dasp::Sample::to_sample))
    }

    fn sample_rate(&self) -> u32 {
        rodio::Source::sample_rate(self)
    }
}
