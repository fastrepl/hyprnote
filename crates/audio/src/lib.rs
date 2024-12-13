use anyhow::Result;
use cpal::traits::{DeviceTrait, HostTrait};

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

    pub fn play() -> Result<()> {
        let host = cpal::default_host();
        let device = host.default_output_device().unwrap();
        let _ = device.default_output_config()?;

        Ok(())
    }
    pub fn record() -> Result<()> {
        let host = cpal::default_host();
        let device = host.default_output_device().unwrap();
        let _ = device.default_output_config()?;

        Ok(())
    }
}
