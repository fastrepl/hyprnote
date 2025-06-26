use anyhow::Result;
use futures_util::Stream;
use std::time::{Duration, Instant};

pub struct SpeakerInput {
    sample_rate: u32,
}

impl SpeakerInput {
    pub fn new(sample_rate_override: Option<u32>) -> Result<Self> {
        let sample_rate = sample_rate_override.unwrap_or(16000);
        tracing::info!(
            "Windows SpeakerInput initialized with sample rate: {}",
            sample_rate
        );
        Ok(Self { sample_rate })
    }

    pub fn stream(self) -> SpeakerStream {
        SpeakerStream::new(self.sample_rate)
    }
}

pub struct SpeakerStream {
    sample_rate: u32,
    start_time: Instant,
    sample_count: u64,
}

impl SpeakerStream {
    pub fn new(sample_rate: u32) -> Self {
        tracing::info!(
            "Windows SpeakerStream created with sample rate: {}",
            sample_rate
        );
        Self {
            sample_rate,
            start_time: Instant::now(),
            sample_count: 0,
        }
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        _cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        // 매우 단순한 구현 - 타이밍이나 복잡한 로직 없이 즉시 반환
        self.sample_count += 1;

        // 주기적으로 로그 출력 (10초마다)
        if self.sample_count % (self.sample_rate as u64 * 10) == 0 {
            tracing::debug!(
                "Windows speaker stream generated {} samples",
                self.sample_count
            );
        }

        // 단순한 정적 값 반환 (타이머나 복잡한 계산 없음)
        std::task::Poll::Ready(Some(0.0))
    }
}
