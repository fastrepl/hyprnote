use anyhow::Result;
use std::time::Duration;

use ca::aggregate_device_keys as agg_keys;
use cidre::{arc, av, cat, cf, core_audio as ca, ns, os};

use crate::format::Format;

pub struct Stream {
    format: Format,
}

// https://github.com/yury/cidre/blob/23efaabee6bf75bfb57a9e7739b2beb83cb93942/cidre/examples/core-audio-record/main.rs
impl Stream {
    pub fn new(format: Format) -> Result<Self> {
        let output_device = ca::System::default_output_device()?;
        let output_uid = output_device.uid()?;

        let sub_device = cf::DictionaryOf::with_keys_values(
            &[ca::sub_device_keys::uid()],
            &[output_uid.as_type_ref()],
        );

        let tap_desc = if format.channels == 1 {
            ca::TapDesc::with_mono_global_tap_excluding_processes(&ns::Array::new())
        } else {
            ca::TapDesc::with_stereo_global_tap_excluding_processes(&ns::Array::new())
        };
        let tap = tap_desc.create_process_tap().unwrap();

        let sub_tap = cf::DictionaryOf::with_keys_values(
            &[ca::sub_device_keys::uid()],
            &[tap.uid().unwrap().as_type_ref()],
        );

        let dict = cf::DictionaryOf::with_keys_values(
            &[
                ca::aggregate_device_keys::is_private(),
                ca::aggregate_device_keys::is_stacked(),
                ca::aggregate_device_keys::tap_auto_start(),
                ca::aggregate_device_keys::name(),
                ca::aggregate_device_keys::main_sub_device(),
                ca::aggregate_device_keys::uid(),
                ca::aggregate_device_keys::sub_device_list(),
                ca::aggregate_device_keys::tap_list(),
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
        let agg_device = ca::AggregateDevice::with_desc(&dict).unwrap();

        let asbd = tap.asbd().unwrap();
        let av_format = av::AudioFormat::with_asbd(&asbd).unwrap();

        struct Ctx {
            format: arc::R<av::AudioFormat>,
        }

        let mut ctx = Ctx { format: av_format };

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
            let buf =
                av::AudioPcmBuf::with_buf_list_no_copy(&ctx.format, input_data, None).unwrap();
            // TODO with buf
            Default::default()
        }

        Ok(Self { format })
    }

    fn create_device(&self) {}

    fn start(&self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main() {
        let format = Format::default();
        let stream = Stream::new(format).unwrap();
    }
}
