use {
    anyhow::Result,
    ringbuf::{
        traits::{Consumer, Producer, Split},
        HeapCons, HeapProd, HeapRb,
    },
    std::{
        sync::{Arc, Mutex},
        task::{Poll, Waker},
    },
};

use cidre::{
    arc,
    at::{self, au},
    av, cat, core_audio as ca, os,
};

struct WakerState {
    waker: Option<Waker>,
    has_data: bool,
}

pub struct MicInput {
    sample_rate_override: Option<u32>,
    // Pointers to change counters that are updated by CoreAudio property listeners.
    _input_change_cnt: *mut usize,
    _output_change_cnt: *mut usize,
}

pub struct MicStream {
    consumer: HeapCons<f32>,
    stream_desc: cat::AudioBasicStreamDesc,
    sample_rate_override: Option<u32>,
    _ctx: Box<Ctx>,
    waker_state: Arc<Mutex<WakerState>>,
}

#[cfg(target_os = "macos")]
impl MicStream {
    pub fn sample_rate(&self) -> u32 {
        self.sample_rate_override
            .unwrap_or(self.stream_desc.sample_rate as u32)
    }
}

struct Ctx {
    format: arc::R<av::AudioFormat>,
    producer: HeapProd<f32>,
    waker_state: Arc<Mutex<WakerState>>,
    audio_data: Vec<f32>,
    vpio: Option<au::Output<at::audio::component::InitializedState>>,
}

impl MicInput {
    pub fn new() -> Self {
        extern "C-unwind" fn device_change_cb(
            _obj_id: ca::Obj,
            _number_addresses: u32,
            _addresses: *const ca::PropAddr,
            client_data: *mut usize,
        ) -> os::Status {
            unsafe { *client_data = (*client_data).saturating_add(1) };
            tracing::info!("core-audio default device changed (mic module)");
            os::Status::NO_ERR
        }

        let input_cnt: *mut usize = Box::into_raw(Box::new(0));
        let output_cnt: *mut usize = Box::into_raw(Box::new(0));

        let _ = ca::System::OBJ.add_prop_listener(
            &ca::PropSelector::HW_DEFAULT_INPUT_DEVICE.global_addr(),
            device_change_cb,
            unsafe { &mut *input_cnt },
        );
        let _ = ca::System::OBJ.add_prop_listener(
            &ca::PropSelector::HW_DEFAULT_OUTPUT_DEVICE.global_addr(),
            device_change_cb,
            unsafe { &mut *output_cnt },
        );

        Self {
            sample_rate_override: None,
            _input_change_cnt: input_cnt,
            _output_change_cnt: output_cnt,
        }
    }

    pub fn stream(self) -> MicStream {
        let rb = HeapRb::<f32>::new(8192);
        let (prod, cons) = rb.split();

        let ws = Arc::new(Mutex::new(WakerState {
            waker: None,
            has_data: false,
        }));

        let (ctx, asbd) =
            build_pipeline(prod, &ws).expect("failed to build microphone capture pipeline");

        MicStream {
            consumer: cons,
            stream_desc: asbd,
            sample_rate_override: self.sample_rate_override,
            _ctx: ctx,
            waker_state: ws,
        }
    }
}

impl Default for MicInput {
    fn default() -> Self {
        Self::new()
    }
}

impl futures_util::Stream for MicStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        // Fast-path: try to pop without touching the mutex.
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

fn build_pipeline(
    producer: HeapProd<f32>,
    waker_state: &Arc<Mutex<WakerState>>,
) -> Result<(Box<Ctx>, cat::AudioBasicStreamDesc)> {
    const BUS_IN: u32 = 1;
    const BUS_OUT: u32 = 0;

    let mut vpio = au::Output::new_apple_vp()?;

    // Add buffer configuration
    vpio.set_should_allocate_input_buf(false)?;
    vpio.set_should_allocate_output_buf(false)?;

    let asbd = vpio.input_stream_format(BUS_IN)?;
    let format = av::AudioFormat::with_asbd(&asbd).unwrap();

    let mut ctx = Box::new(Ctx {
        format,
        producer,
        waker_state: waker_state.clone(),
        audio_data: Vec::new(), // Initialize empty, will set after allocation
        vpio: None,
    });

    extern "C-unwind" fn mic_cb(
        ctx: *mut Ctx,
        _io_action_flags: &mut au::RenderActionFlags,
        _in_timestamp: &at::AudioTimeStamp,
        _in_bus_num: u32,
        in_number_frames: u32,
        _io_data: *mut at::AudioBufList<1>,
    ) -> os::Status {
        if ctx.is_null() {
            return au::err::NO_CONNECTION.into();
        }
        let ctx = unsafe { &mut *ctx };

        // Create our own buffer list
        let mut buf_list = at::AudioBufList::<1>::new();
        buf_list.buffers[0] = at::AudioBuf {
            number_channels: 1,
            data_bytes_size: (std::mem::size_of::<f32>() * ctx.audio_data.len()) as u32,
            data: ctx.audio_data.as_mut_ptr() as *mut _,
        };

        // Render audio into our buffer
        if let Err(e) = ctx
            .vpio
            .as_mut()
            .unwrap()
            .render(in_number_frames, &mut buf_list, 1)
        {
            return e.status();
        }

        // Process the audio data
        let buffer_size = ctx.audio_data.len();
        let pushed = ctx.producer.push_slice(&ctx.audio_data);
        if pushed < buffer_size {
            tracing::warn!("macos_mic_dropped_{}_samples", buffer_size - pushed);
        }

        // Wake consumer
        let mut waker_state = ctx.waker_state.lock().unwrap();
        if pushed > 0 && !waker_state.has_data {
            waker_state.has_data = true;
            if let Some(waker) = waker_state.waker.take() {
                waker.wake();
            }
        }

        os::Status::NO_ERR
    }

    vpio.set_input_cb::<1, Ctx>(mic_cb, ctx.as_mut() as *mut Ctx)?;
    vpio.set_io_enabled(au::Scope::INPUT, BUS_IN, true)?;
    vpio.set_io_enabled(au::Scope::OUTPUT, BUS_OUT, false)?;

    let mut vpio = vpio.allocate_resources()?;
    // Get actual buffer size AFTER allocation
    let buffer_size = vpio.unit().max_frames_per_slice()? as usize;
    ctx.audio_data = vec![0f32; buffer_size];
    vpio.start()?;

    ctx.vpio = Some(vpio);

    Ok((ctx, asbd))
}

impl kalosm_sound::AsyncSource for MicStream {
    fn as_stream(&mut self) -> impl futures_util::Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate()
    }
}
