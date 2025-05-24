use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};

use anyhow::Result;
use futures_util::Stream;
use ringbuf::{
    traits::{Consumer, Producer, Split},
    HeapCons, HeapProd, HeapRb,
};

use ca::aggregate_device_keys as agg_keys;
use cidre::{arc, av, cat, cf, core_audio as ca, ns, os};

// https://github.com/yury/cidre/blob/7bc6c3a/cidre/examples/core-audio-record/main.rs
// https://github.com/floneum/floneum/blob/50afe10/interfaces/kalosm-sound/src/source/mic.rs#L41
pub struct SpeakerInput {
    tap: ca::TapGuard,
    agg_desc: arc::Retained<cf::DictionaryOf<cf::String, cf::Type>>,
    sample_rate_override: Option<u32>,
}

struct WakerState {
    waker: Option<Waker>,
    has_data: bool,
}

pub struct SpeakerStream {
    consumer: HeapCons<f32>,
    stream_desc: cat::AudioBasicStreamDesc,
    sample_rate_override: Option<u32>,
    _device: ca::hardware::StartedDevice<ca::AggregateDevice>,
    _ctx: Box<Ctx>,
    _tap: ca::TapGuard,
    waker_state: Arc<Mutex<WakerState>>,
}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        tracing::info!(
            tap_sample_rate = self.stream_desc.sample_rate,
            override_sample_rate = self.sample_rate_override,
            "speaker_stream"
        );

        self.sample_rate_override
            .unwrap_or(self.stream_desc.sample_rate as u32)
    }
}

struct Ctx {
    format: arc::R<av::AudioFormat>,
    producer: HeapProd<f32>,
    waker_state: Arc<Mutex<WakerState>>,
}

impl SpeakerInput {
    pub fn new(sample_rate_override: Option<u32>) -> Result<Self> {
        let output_device = ca::System::default_output_device()?;
        let output_uid = output_device.uid()?;

        tracing::info!(
            name = ?output_device.name().unwrap().to_string(),
            nominal_sample_rate = ?output_device.nominal_sample_rate().unwrap(),
            actual_sample_rate = ?output_device.actual_sample_rate().unwrap(),
            "speaker_output_device"
        );

        let sub_device = cf::DictionaryOf::with_keys_values(
            &[ca::sub_device_keys::uid()],
            &[output_uid.as_type_ref()],
        );

        let tap_desc = ca::TapDesc::with_mono_global_tap_excluding_processes(&ns::Array::new());
        let tap = tap_desc.create_process_tap()?;

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
            ],
            &[
                cf::Boolean::value_true().as_type_ref(),
                cf::Boolean::value_false(),
                cf::Boolean::value_true(),
                cf::str!(c"hypr-audio-tap"),
                &output_uid,
                &cf::Uuid::new().to_cf_string(),
                &cf::ArrayOf::from_slice(&[sub_device.as_ref()]),
                &cf::ArrayOf::from_slice(&[sub_tap.as_ref()]),
            ],
        );

        Ok(Self {
            tap,
            agg_desc,
            sample_rate_override,
        })
    }

    fn start_device(
        &self,
        ctx: &mut Box<Ctx>,
    ) -> Result<ca::hardware::StartedDevice<ca::AggregateDevice>> {
        extern "C" fn proc(
            _device: ca::Device,
            _now: &cat::AudioTimeStamp,
            input_data: &cat::AudioBufList<1>,
            _input_time: &cat::AudioTimeStamp,
            _output_data: &mut cat::AudioBufList<1>,
            _output_time: &cat::AudioTimeStamp,
            ctx: Option<&mut Ctx>,
        ) -> os::Status {
            let ctx = ctx.unwrap();

            assert_eq!(ctx.format.common_format(), av::audio::CommonFormat::PcmF32);

            if let Some(view) =
                av::AudioPcmBuf::with_buf_list_no_copy(&ctx.format, input_data, None)
            {
                if let Some(data) = view.data_f32_at(0) {
                    let buffer_size = data.len();
                    let pushed = ctx.producer.push_slice(data);
                    if pushed < buffer_size {
                        tracing::warn!("macos_speaker_dropped_{}_samples", buffer_size - pushed,);
                    }

                    let mut waker_state = ctx.waker_state.lock().unwrap();
                    if pushed > 0 && !waker_state.has_data {
                        waker_state.has_data = true;
                        if let Some(waker) = waker_state.waker.take() {
                            drop(waker_state);
                            waker.wake();
                        }
                    }
                }
            } else {
                tracing::warn!("macos_speaker_empty_buffer");
            }

            os::Status::NO_ERR
        }

        let agg_device = ca::AggregateDevice::with_desc(&self.agg_desc)?;
        let proc_id = agg_device.create_io_proc_id(proc, Some(ctx))?;
        let started_device = ca::device_start(agg_device, Some(proc_id))?;

        Ok(started_device)
    }

    pub fn stream(self) -> SpeakerStream {
        let asbd = self.tap.asbd().unwrap();
        let format = av::AudioFormat::with_asbd(&asbd).unwrap();

        let rb = HeapRb::<f32>::new(8192);
        let (producer, consumer) = rb.split();

        let waker_state = Arc::new(Mutex::new(WakerState {
            waker: None,
            has_data: false,
        }));

        let mut ctx = Box::new(Ctx {
            format,
            producer,
            waker_state: waker_state.clone(),
        });

        let device = self.start_device(&mut ctx).unwrap();

        SpeakerStream {
            consumer,
            stream_desc: asbd,
            sample_rate_override: self.sample_rate_override,
            _device: device,
            _ctx: ctx,
            _tap: self.tap,
            waker_state,
        }
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        if let Some(sample) = self.consumer.try_pop() {
            return Poll::Ready(Some(sample));
        }

        {
            let mut state = self.waker_state.lock().unwrap();
            state.has_data = false;
            state.waker = Some(cx.waker().clone());
            drop(state);
        }

        match self.consumer.try_pop() {
            Some(sample) => Poll::Ready(Some(sample)),
            None => Poll::Pending,
        }
    }
}
