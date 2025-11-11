use std::{
    collections::VecDeque,
    sync::Arc,
    time::{Duration, Instant},
};

use ractor::{registry, Actor, ActorName, ActorProcessingErr, ActorRef};
use tauri_specta::Event;

use crate::{
    actors::{AudioChunk, ChannelMode, ListenerActor, ListenerMsg, RecMsg, RecorderActor},
    SessionEvent,
};

const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);

pub enum ProcMsg {
    Mic(AudioChunk),
    Speaker(AudioChunk),
    SetMode(ChannelMode),
    Reset,
}

pub struct ProcArgs {
    pub app: tauri::AppHandle,
}

pub struct ProcState {
    app: tauri::AppHandle,
    agc_m: hypr_agc::Agc,
    agc_s: hypr_agc::Agc,
    joiner: Joiner,
    last_sent_mic: Option<Arc<[f32]>>,
    last_sent_spk: Option<Arc<[f32]>>,
    last_amp_emit: Instant,
    mode: ChannelMode,
}

impl ProcState {
    fn reset_pipeline(&mut self) {
        self.joiner.reset();
        self.last_sent_mic = None;
        self.last_sent_spk = None;
        self.agc_m = hypr_agc::Agc::default();
        self.agc_s = hypr_agc::Agc::default();
        self.last_amp_emit = Instant::now();
    }
}

pub struct ProcessorActor {}

impl ProcessorActor {
    pub fn name() -> ActorName {
        "processor_actor".into()
    }
}

#[ractor::async_trait]
impl Actor for ProcessorActor {
    type Msg = ProcMsg;
    type State = ProcState;
    type Arguments = ProcArgs;

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        Ok(ProcState {
            app: args.app.clone(),
            joiner: Joiner::new(),
            agc_m: hypr_agc::Agc::default(),
            agc_s: hypr_agc::Agc::default(),
            last_sent_mic: None,
            last_sent_spk: None,
            last_amp_emit: Instant::now(),
            mode: ChannelMode::Dual,
        })
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match msg {
            ProcMsg::Mic(mut c) => {
                st.agc_m.process(&mut c.data);
                let arc = Arc::<[f32]>::from(c.data);
                st.joiner.push_mic(arc);
                process_ready(st).await;
            }
            ProcMsg::Speaker(mut c) => {
                st.agc_s.process(&mut c.data);
                let arc = Arc::<[f32]>::from(c.data);
                st.joiner.push_spk(arc);
                process_ready(st).await;
            }
            ProcMsg::SetMode(mode) => {
                if st.mode != mode {
                    st.mode = mode;
                    st.reset_pipeline();
                }
            }
            ProcMsg::Reset => {
                st.reset_pipeline();
            }
        }
        Ok(())
    }
}

async fn process_ready(st: &mut ProcState) {
    while let Some((mic, spk)) = st.joiner.pop_pair(st.mode) {
        let mut audio_sent_successfully = false;

        if let Some(cell) = registry::where_is(RecorderActor::name()) {
            let mixed: Vec<f32> = mic
                .iter()
                .zip(spk.iter())
                .map(|(m, s)| (m + s).clamp(-1.0, 1.0))
                .collect();

            let actor: ActorRef<RecMsg> = cell.into();
            if let Err(e) = actor.cast(RecMsg::Audio(mixed)) {
                tracing::error!(error = ?e, "failed_to_send_audio_to_recorder");
            }
        }

        if let Some(cell) = registry::where_is(ListenerActor::name()) {
            let (mic_bytes, spk_bytes) = if st.mode == ChannelMode::Single {
                let mixed: Vec<f32> = mic
                    .iter()
                    .zip(spk.iter())
                    .map(|(m, s)| (m + s).clamp(-1.0, 1.0))
                    .collect();
                let mixed_bytes = hypr_audio_utils::f32_to_i16_bytes(mixed.iter().copied());
                (
                    hypr_audio_utils::f32_to_i16_bytes(mic.iter().copied()),
                    mixed_bytes,
                )
            } else {
                (
                    hypr_audio_utils::f32_to_i16_bytes(mic.iter().copied()),
                    hypr_audio_utils::f32_to_i16_bytes(spk.iter().copied()),
                )
            };

            let actor: ActorRef<ListenerMsg> = cell.into();
            if actor
                .cast(ListenerMsg::Audio(mic_bytes.into(), spk_bytes.into()))
                .is_ok()
            {
                audio_sent_successfully = true;
                st.last_sent_mic = Some(mic.clone());
                st.last_sent_spk = Some(spk.clone());
            } else {
                tracing::warn!(actor = ListenerActor::name(), "cast_failed");
            }
        } else {
            tracing::debug!(actor = ListenerActor::name(), "unavailable");
        }

        if audio_sent_successfully && st.last_amp_emit.elapsed() >= AUDIO_AMPLITUDE_THROTTLE {
            if let (Some(mic_data), Some(spk_data)) = (&st.last_sent_mic, &st.last_sent_spk) {
                if let Err(e) =
                    SessionEvent::from((mic_data.as_ref(), spk_data.as_ref())).emit(&st.app)
                {
                    tracing::error!("{:?}", e);
                }
                st.last_amp_emit = Instant::now();
            }
        }
    }
}

struct Joiner {
    mic: VecDeque<Arc<[f32]>>,
    spk: VecDeque<Arc<[f32]>>,
    silence_cache: std::collections::HashMap<usize, Arc<[f32]>>,
}

impl Joiner {
    const MAX_LAG: usize = 4;
    const MAX_QUEUE_SIZE: usize = 30;

    fn new() -> Self {
        Self {
            mic: VecDeque::new(),
            spk: VecDeque::new(),
            silence_cache: std::collections::HashMap::new(),
        }
    }

    fn reset(&mut self) {
        self.mic.clear();
        self.spk.clear();
    }

    fn get_silence(&mut self, len: usize) -> Arc<[f32]> {
        self.silence_cache
            .entry(len)
            .or_insert_with(|| Arc::from(vec![0.0; len]))
            .clone()
    }

    fn push_mic(&mut self, data: Arc<[f32]>) {
        self.mic.push_back(data);
        if self.mic.len() > Self::MAX_QUEUE_SIZE {
            tracing::warn!("mic_queue_overflow");
            self.mic.pop_front();
        }
    }

    fn push_spk(&mut self, data: Arc<[f32]>) {
        self.spk.push_back(data);
        if self.spk.len() > Self::MAX_QUEUE_SIZE {
            tracing::warn!("spk_queue_overflow");
            self.spk.pop_front();
        }
    }

    fn pop_pair(&mut self, mode: ChannelMode) -> Option<(Arc<[f32]>, Arc<[f32]>)> {
        match (self.mic.front(), self.spk.front()) {
            (Some(_), Some(_)) => {
                let mic = self.mic.pop_front()?;
                let spk = self.spk.pop_front()?;
                Some((mic, spk))
            }
            (Some(_), None) if mode == ChannelMode::Single || self.mic.len() > Self::MAX_LAG => {
                let mic = self.mic.pop_front()?;
                let spk = self.get_silence(mic.len());
                Some((mic, spk))
            }
            (None, Some(_)) if self.spk.len() > Self::MAX_LAG => {
                let spk = self.spk.pop_front()?;
                let mic = self.get_silence(spk.len());
                Some((mic, spk))
            }
            _ => None,
        }
    }
}
