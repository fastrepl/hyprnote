mod error;
mod predictor;
mod stream;

pub use error::*;
pub use predictor::*;
pub use stream::*;

use kalosm_sound::AsyncSource;
use std::time::Duration;

pub trait ChunkerExt: AsyncSource + Sized {
    fn chunks<P: Predictor + Unpin>(
        self,
        predictor: P,
        chunk_duration: Duration,
    ) -> ChunkStream<Self, P>
    where
        Self: Unpin,
    {
        ChunkStream::new(self, predictor, chunk_duration)
    }
}

impl<T: AsyncSource> ChunkerExt for T {}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    async fn test_chunker() {
        let audio_source = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let mut stream = audio_source.chunks(RMS::new(), Duration::from_secs(15));
        let mut i = 0;

        let _ = std::fs::remove_dir_all("tmp/english_1");
        let _ = std::fs::create_dir_all("tmp/english_1");

        while let Some(chunk) = stream.next().await {
            let file = std::fs::File::create(format!("tmp/english_1/chunk_{}.wav", i)).unwrap();
            let mut writer = hound::WavWriter::new(file, spec).unwrap();
            for sample in chunk {
                writer.write_sample(sample).unwrap();
            }
            i += 1;
        }
    }
}
