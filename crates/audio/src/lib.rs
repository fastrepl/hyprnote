mod format;
mod mic;
mod mixer;
mod source;
mod speaker;

use anyhow::Result;
use cpal::traits::{DeviceTrait, HostTrait};
pub use mic::*;
pub use mixer::*;
pub use source::*;
pub use speaker::*;

pub struct Audio {
    config: Config,
}

pub struct Config {
    pub sampling_rate: u32,
}

impl Audio {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    pub fn to_speaker(bytes: &'static [u8]) {
        use rodio::{Decoder, OutputStream, Sink};

        std::thread::spawn(move || {
            if let Ok((_, stream)) = OutputStream::try_default() {
                let file = std::io::Cursor::new(bytes);
                let source = Decoder::new(file).unwrap();
                let sink = Sink::try_new(&stream).unwrap();
                sink.append(source);
                sink.sleep_until_end();
            }
        });
    }
    pub fn from_mic() -> Result<()> {
        let host = cpal::default_host();
        let device = host.default_input_device().unwrap();
        let config = device.default_input_config()?;

        Ok(())
    }

    pub fn from_speaker() -> Result<()> {
        Ok(())
    }
}
