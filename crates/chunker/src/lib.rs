mod fixed;

pub use fixed::*;

use kalosm_sound::AsyncSource;
use std::time::Duration;

pub trait ChunkerExt: AsyncSource + Sized {
    fn fixed_chunks(self, chunk_duration: Duration) -> FixedChunkStream<Self>
    where
        Self: Unpin,
    {
        FixedChunkStream::new(self, chunk_duration)
    }
}

impl<T: AsyncSource> ChunkerExt for T {}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    async fn test_chunker() {
        let audio_source = rodio::Decoder::new_wav(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let mut stream = audio_source.fixed_chunks(Duration::from_secs(12));
        let mut i = 0;
        while let Some(chunk) = stream.next().await {
            let file = std::fs::File::create(format!("chunk_{}.wav", i)).unwrap();
            let mut writer = hound::WavWriter::new(file, spec).unwrap();
            for sample in chunk {
                writer.write_sample(sample).unwrap();
            }
            i += 1;
        }
    }
}
