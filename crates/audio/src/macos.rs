use std::time::Duration;

use ca::aggregate_device_keys as agg_keys;
use ca::sub_device_keys as sub_keys;
use cidre::{arc, av, cat, cf, core_audio as ca, ns, os};

pub fn main() {
    let output_device = ca::System::default_output_device().unwrap();
    let output_uid = output_device.uid().unwrap();

    let sub_device =
        cf::DictionaryOf::with_keys_values(&[sub_keys::uid()], &[output_uid.as_type_ref()]);

    let tap_desc = ca::TapDesc::with_stereo_global_tap_excluding_processes(&ns::Array::new());
    let tap = tap_desc.create_process_tap().unwrap();

    let sub_tap =
        cf::DictionaryOf::with_keys_values(&[sub_keys::uid()], &[tap.uid().unwrap().as_type_ref()]);

    // magic configuration for aggregate device
    let dict = cf::DictionaryOf::with_keys_values(
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
            cf::str!(c"Tap"),
            &output_uid,
            &cf::Uuid::new().to_cf_string(),
            &cf::ArrayOf::from_slice(&[sub_device.as_ref()]),
            &cf::ArrayOf::from_slice(&[sub_tap.as_ref()]),
        ],
    );
    let agg_device = ca::AggregateDevice::with_desc(&dict).unwrap();

    let asbd = tap.asbd().unwrap();
    let format = av::AudioFormat::with_asbd(&asbd).unwrap();
    let url = ns::Url::with_fs_path_string(ns::str!(c"/tmp/record.wav"), false);
    let file = av::AudioFile::open_write_common_format(
        &url,
        &format.settings(),
        av::audio::CommonFormat::PcmF32,
        format.is_interleaved(),
    )
    .unwrap();

    struct Ctx {
        file: arc::R<av::AudioFile>,
        format: arc::R<av::AudioFormat>,
    }

    let mut ctx = Ctx { file, format };

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
        let buf = av::AudioPcmBuf::with_buf_list_no_copy(&ctx.format, input_data, None).unwrap();
        ctx.file.write(&buf).unwrap();
        Default::default()
    }

    {
        let proc_id = agg_device.create_io_proc_id(proc, Some(&mut ctx)).unwrap();
        let _started_device = ca::device_start(agg_device, Some(proc_id)).unwrap();
        std::thread::sleep(Duration::from_secs(3));
    }

    ctx.file.close();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main() {
        main();
    }
}
