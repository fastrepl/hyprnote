use anyhow::Result;
use futures_util::StreamExt;

use ca::aggregate_device_keys as agg_keys;
use cidre::{arc, av, cat, cf, core_audio as ca, ns, os};

// https://github.com/yury/cidre/blob/7bc6c3addbd3fe2c586fbe15319a17f6d16c9049/cidre/examples/core-audio-record/main.rs
// https://github.com/floneum/floneum/blob/92129ec99aac446348f42bc6db326a6d1c2d99ae/interfaces/kalosm-sound/src/source/mic.rs#L41
#[cfg(target_os = "macos")]
pub struct SpeakerInput {
    tap: ca::TapGuard,
    agg_desc: arc::Retained<cf::DictionaryOf<cf::String, cf::Type>>,
}

#[cfg(target_os = "macos")]
pub struct SpeakerStream {
    read_data: Vec<f32>,
    receiver: std::pin::Pin<Box<dyn futures_core::Stream<Item = f32> + Send + Sync>>,
    device: ca::hardware::StartedDevice<ca::AggregateDevice>,
    _ctx: Box<Ctx>,
    stream_desc: cat::AudioBasicStreamDesc,
}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        self.stream_desc.sample_rate as u32
    }
}

#[derive(Clone)]
struct Ctx {
    format: arc::R<av::AudioFormat>,
    sender: futures_channel::mpsc::UnboundedSender<Vec<f32>>,
}

impl SpeakerInput {
    pub fn new() -> Result<Self> {
        let output_device = ca::System::default_output_device()?;
        let output_uid = output_device.uid()?;

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

        Ok(Self { tap, agg_desc })
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

            let view =
                av::AudioPcmBuf::with_buf_list_no_copy(&ctx.format, input_data, None).unwrap();

            if let Some(data) = view.data_f32_at(0) {
                let samples = data.to_vec();
                ctx.sender.start_send(samples).unwrap();
            }

            os::Status::NO_ERR
        }

        let agg_device = ca::AggregateDevice::with_desc(&self.agg_desc)?;
        let proc_id = agg_device.create_io_proc_id(proc, Some(ctx))?;
        let started_device = ca::device_start(agg_device, Some(proc_id))?;

        Ok(started_device)
    }

    pub fn stream(&self) -> SpeakerStream {
        let asbd = self.tap.asbd().unwrap();
        let format = av::AudioFormat::with_asbd(&asbd).unwrap();

        let (tx, rx) = futures_channel::mpsc::unbounded();
        let mut ctx = Box::new(Ctx { format, sender: tx });

        let device = self.start_device(&mut ctx).unwrap();
        let receiver = rx.map(futures_util::stream::iter).flatten();

        SpeakerStream {
            receiver: Box::pin(receiver),
            read_data: Vec::new(),
            device,
            _ctx: ctx,
            stream_desc: asbd,
        }
    }
}

impl futures_core::Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        match self.receiver.as_mut().poll_next_unpin(cx) {
            std::task::Poll::Ready(Some(data_chunk)) => {
                self.read_data.push(data_chunk);
                std::task::Poll::Ready(Some(data_chunk))
            }
            std::task::Poll::Ready(None) => std::task::Poll::Ready(None),
            std::task::Poll::Pending => std::task::Poll::Pending,
        }
    }
}
