use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};

use anyhow::Result;
use futures_util::Stream;

use ringbuf::{
    traits::{Consumer, Producer, Split},
    HeapCons, HeapProd, HeapRb,
};

use ca::aggregate_device_keys as agg_keys;
use ca::sub_device_keys;
use cidre::{arc, av, cat, cf, core_audio as ca, ns, os};

pub struct MixedInput {
    tap: ca::TapGuard,
    agg_desc: arc::Retained<cf::DictionaryOf<cf::String, cf::Type>>,
}

pub struct MixedStream {
    consumer: HeapCons<f32>,
    _device: ca::hardware::StartedDevice<ca::AggregateDevice>,
    _ctx: Box<MixedCtx>,
    _tap: ca::TapGuard,
    waker_state: Arc<Mutex<WakerState>>,
    current_sample_rate: Arc<AtomicU32>,
}

impl MixedStream {
    pub fn sample_rate(&self) -> u32 {
        self.current_sample_rate.load(Ordering::Acquire)
    }
}

struct WakerState {
    waker: Option<Waker>,
    has_data: bool,
}

struct MixedCtx {
    format: arc::R<av::AudioFormat>,
    producer: HeapProd<f32>,
    waker_state: Arc<Mutex<WakerState>>,
    current_sample_rate: Arc<AtomicU32>,
    consecutive_drops: Arc<AtomicU32>,
    should_terminate: Arc<AtomicBool>,
}

impl MixedInput {
    pub fn new() -> Result<Self> {
        let input_device = ca::System::default_input_device()?;
        let input_uid = input_device.uid()?;

        let output_device = ca::System::default_output_device()?;
        let output_uid = output_device.uid()?;

        let tap_desc = ca::TapDesc::with_mono_global_tap_excluding_processes(&ns::Array::new());
        let tap = tap_desc.create_process_tap()?;

        let agg_desc = Self::create_aggregate_description(&tap, &input_uid, &output_uid)?;

        Ok(Self { tap, agg_desc })
    }

    fn create_aggregate_description(
        tap: &ca::TapGuard,
        input_uid: &cf::String,
        output_uid: &cf::String,
    ) -> Result<arc::Retained<cf::DictionaryOf<cf::String, cf::Type>>> {
        let input_sub_device = cf::DictionaryOf::with_keys_values(
            &[sub_device_keys::uid()],
            &[input_uid.as_type_ref()],
        );

        let output_sub_device = cf::DictionaryOf::with_keys_values(
            &[sub_device_keys::uid()],
            &[output_uid.as_type_ref()],
        );

        let sub_tap = cf::DictionaryOf::with_keys_values(
            &[ca::sub_device_keys::uid()],
            &[tap.uid().unwrap().as_type_ref()],
        );

        let agg_desc = cf::DictionaryOf::with_keys_values(
            &[
                agg_keys::is_private(),
                agg_keys::is_stacked(),
                agg_keys::tap_auto_start(),
                agg_keys::name(),
                agg_keys::main_sub_device(),
                agg_keys::uid(),
                agg_keys::sub_device_list(),
                agg_keys::tap_list(),
                agg_keys::clock_device(),
            ],
            &[
                cf::Boolean::value_true().as_type_ref(),
                cf::Boolean::value_false(),
                cf::Boolean::value_true(),
                cf::str!(c"mixed-audio-tap"),
                &output_uid,
                &cf::Uuid::new().to_cf_string(),
                &cf::ArrayOf::from_slice(&[input_sub_device.as_ref(), output_sub_device.as_ref()]),
                &cf::ArrayOf::from_slice(&[sub_tap.as_ref()]),
                &input_uid,
            ],
        );

        Ok(agg_desc)
    }

    fn start_device(
        &self,
        ctx: &mut Box<MixedCtx>,
    ) -> Result<ca::hardware::StartedDevice<ca::AggregateDevice>> {
        extern "C" fn proc(
            device: ca::Device,
            _now: &cat::AudioTimeStamp,
            input_data: &cat::AudioBufList<1>,
            _input_time: &cat::AudioTimeStamp,
            _output_data: &mut cat::AudioBufList<1>,
            _output_time: &cat::AudioTimeStamp,
            ctx: Option<&mut MixedCtx>,
        ) -> os::Status {
            let ctx = ctx.unwrap();

            ctx.current_sample_rate.store(
                device
                    .nominal_sample_rate()
                    .unwrap_or(ctx.format.absd().sample_rate) as u32,
                Ordering::Release,
            );

            if let Some(view) =
                av::AudioPcmBuf::with_buf_list_no_copy(&ctx.format, input_data, None)
            {
                let format = view.format();

                if format.channel_count() > 1 {
                    let frame_count = view.frame_len() as usize;
                    let mut mixed_buffer = Vec::with_capacity(frame_count);

                    for frame_idx in 0..frame_count {
                        let mut mixed_sample = 0.0f32;
                        let channel_count = format.channel_count() as usize;

                        for channel in 0..channel_count {
                            if let Some(channel_data) = view.data_f32_at(channel) {
                                if frame_idx < channel_data.len() {
                                    mixed_sample += channel_data[frame_idx];
                                }
                            }
                        }

                        mixed_sample /= channel_count as f32;
                        mixed_buffer.push(mixed_sample);
                    }

                    process_mixed_audio_data(ctx, &mixed_buffer);
                } else if let Some(data) = view.data_f32_at(0) {
                    process_mixed_audio_data(ctx, data);
                }
            } else if ctx.format.common_format() == av::audio::CommonFormat::PcmF32 {
                let first_buffer = &input_data.buffers[0];
                let byte_count = first_buffer.data_bytes_size as usize;
                let float_count = byte_count / std::mem::size_of::<f32>();

                if float_count > 0 && first_buffer.data != std::ptr::null_mut() {
                    let data = unsafe {
                        std::slice::from_raw_parts(first_buffer.data as *const f32, float_count)
                    };
                    process_mixed_audio_data(ctx, data);
                }
            }

            os::Status::NO_ERR
        }

        let agg_device = ca::AggregateDevice::with_desc(&self.agg_desc)?;
        let proc_id = agg_device.create_io_proc_id(proc, Some(ctx))?;
        let started_device = ca::device_start(agg_device, Some(proc_id))?;

        Ok(started_device)
    }

    pub fn stream(self) -> MixedStream {
        let asbd = self.tap.asbd().unwrap();
        let format = av::AudioFormat::with_asbd(&asbd).unwrap();

        let buffer_size = 1024 * 128;
        let rb = HeapRb::<f32>::new(buffer_size);
        let (producer, consumer) = rb.split();

        let waker_state = Arc::new(Mutex::new(WakerState {
            waker: None,
            has_data: false,
        }));

        let current_sample_rate = Arc::new(AtomicU32::new(asbd.sample_rate as u32));

        let mut ctx = Box::new(MixedCtx {
            format,
            producer,
            waker_state: waker_state.clone(),
            current_sample_rate: current_sample_rate.clone(),
            consecutive_drops: Arc::new(AtomicU32::new(0)),
            should_terminate: Arc::new(AtomicBool::new(false)),
        });

        let device = self.start_device(&mut ctx).unwrap();

        MixedStream {
            consumer,
            _device: device,
            _ctx: ctx,
            _tap: self.tap,
            waker_state,
            current_sample_rate,
        }
    }
}

fn process_mixed_audio_data(ctx: &mut MixedCtx, data: &[f32]) {
    let buffer_size = data.len();
    let pushed = ctx.producer.push_slice(data);

    if pushed < buffer_size {
        let consecutive = ctx.consecutive_drops.fetch_add(1, Ordering::AcqRel) + 1;

        if consecutive > 10 {
            ctx.should_terminate.store(true, Ordering::Release);
            return;
        }
    } else {
        ctx.consecutive_drops.store(0, Ordering::Release);
    }

    if pushed > 0 {
        let should_wake = {
            let mut waker_state = ctx.waker_state.lock().unwrap();
            if !waker_state.has_data {
                waker_state.has_data = true;
                waker_state.waker.take()
            } else {
                None
            }
        };

        if let Some(waker) = should_wake {
            waker.wake();
        }
    }
}

impl Stream for MixedStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        if let Some(sample) = self.consumer.try_pop() {
            return Poll::Ready(Some(sample));
        }

        if self._ctx.should_terminate.load(Ordering::Acquire) {
            return match self.consumer.try_pop() {
                Some(sample) => Poll::Ready(Some(sample)),
                None => Poll::Ready(None),
            };
        }

        {
            let mut state = self.waker_state.lock().unwrap();
            state.has_data = false;
            state.waker = Some(cx.waker().clone());
        }

        Poll::Pending
    }
}

impl Drop for MixedStream {
    fn drop(&mut self) {
        self._ctx.should_terminate.store(true, Ordering::Release);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{play_sine_for_sec, AudioOutput};

    use futures_util::StreamExt;

    #[tokio::test]
    async fn test_macos() {
        let input = MixedInput::new().unwrap();
        let mut stream = input.stream();

        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let stop = AudioOutput::silence();
        let handle = play_sine_for_sec(2);

        let mut buffer = Vec::new();
        let now = std::time::Instant::now();
        while let Some(sample) = stream.next().await {
            buffer.push(sample);
            if now.elapsed() > std::time::Duration::from_secs(4) {
                break;
            }
        }

        stop.send(()).unwrap();
        handle.join().unwrap();
        assert!(buffer.iter().any(|x| *x != 0.0));

        {
            let sample_rate = stream.sample_rate();

            let mut writer = hound::WavWriter::create(
                "./out.wav",
                hound::WavSpec {
                    channels: 1,
                    sample_rate,
                    bits_per_sample: 32,
                    sample_format: hound::SampleFormat::Float,
                },
            )
            .unwrap();

            for sample in buffer {
                writer.write_sample(sample).unwrap();
            }
            writer.finalize().unwrap();
        }
    }
}
