pub struct Format {
    pub sample_rate: u32,
    pub channels: u8,
    pub bits_per_sample: u8,
}

impl Default for Format {
    fn default() -> Self {
        Self {
            sample_rate: 16000,
            channels: 1,
            bits_per_sample: 16,
        }
    }
}
