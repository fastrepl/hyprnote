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
    // Objects that must stay alive while the stream is active.
    _vpio: au::Output<at::audio::component::InitializedState>,
    _ctx: Box<Ctx>,
    waker_state: Arc<Mutex<WakerState>>,
}

#[cfg(target_os = "macos")]
impl MicStream {
    /// Return the current sample-rate (overridden value preferred).
    pub fn sample_rate(&self) -> u32 {
        self.sample_rate_override
            .unwrap_or(self.stream_desc.sample_rate as u32)
    }
}

// Context passed to the AudioUnit callback.
struct Ctx {
    format: arc::R<av::AudioFormat>,
    producer: HeapProd<f32>,
    waker_state: Arc<Mutex<WakerState>>,
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

        let (vpio, ctx, asbd) =
            build_pipeline(prod, &ws).expect("failed to build microphone capture pipeline");

        MicStream {
            consumer: cons,
            stream_desc: asbd,
            sample_rate_override: self.sample_rate_override,
            _vpio: vpio,
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
) -> Result<(
    au::Output<at::audio::component::InitializedState>,
    Box<Ctx>,
    cat::AudioBasicStreamDesc,
)> {
    const BUS_IN: u32 = 1;
    const BUS_OUT: u32 = 0;

    let mut vpio = au::Output::new_apple_vp()?;

    let asbd = vpio.input_stream_format(BUS_IN)?;
    let format = av::AudioFormat::with_asbd(&asbd).unwrap();

    let mut ctx = Box::new(Ctx {
        format,
        producer,
        waker_state: waker_state.clone(),
    });

    extern "C-unwind" fn mic_cb(
        in_ref_con: *mut Ctx,
        _flags: &mut au::RenderActionFlags,
        _ts: &at::AudioTimeStamp,
        _bus: u32,
        _n: u32,
        io_data: *mut at::AudioBufList<1>,
    ) -> os::Status {
        let ctx = unsafe { &mut *in_ref_con };
        if let Some(view) =
            av::AudioPcmBuf::with_buf_list_no_copy(&ctx.format, unsafe { &*io_data }, None)
        {
            if let Some(slice) = view.data_f32_at(0) {
                let _ = ctx.producer.push_slice(slice);
                let mut ws = ctx.waker_state.lock().unwrap();
                if let Some(w) = ws.waker.take() {
                    ws.has_data = true;
                    drop(ws);
                    w.wake();
                }
            }
        }
        os::Status::NO_ERR
    }

    vpio.set_input_cb::<1, Ctx>(mic_cb, ctx.as_mut() as *mut Ctx)?;
    vpio.set_io_enabled(au::Scope::INPUT, BUS_IN, true)?;
    vpio.set_io_enabled(au::Scope::OUTPUT, BUS_OUT, false)?;

    let mut vpio = vpio.allocate_resources()?;
    vpio.start()?;

    Ok((vpio, ctx, asbd))
}

impl kalosm_sound::AsyncSource for MicStream {
    fn as_stream(&mut self) -> impl futures_util::Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate()
    }
}
