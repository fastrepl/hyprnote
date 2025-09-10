use std::{
    collections::VecDeque,
    sync::Arc,
    time::{Duration, Instant},
};

use ractor::{Actor, ActorProcessingErr, ActorRef};
use tauri_specta::Event;

use crate::{
    actors::{AudioChunk, ListenMsg, RecMsg},
    SessionEvent,
};

const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);

pub enum ProcMsg {
    Mic(AudioChunk),
    Spk(AudioChunk),
    AttachRecorder(ActorRef<RecMsg>),
    AttachListen(ActorRef<ListenMsg>),
}

pub struct ProcArgs {
    pub app: tauri::AppHandle,
    pub mixed_to: Option<ActorRef<RecMsg>>,
    pub rec_to: Option<ActorRef<RecMsg>>,
    pub listen_tx: Option<ActorRef<ListenMsg>>,
}

pub struct ProcState {
    app: tauri::AppHandle,
    joiner: Joiner,
    aec: hypr_aec::AEC,
    agc_m: hypr_agc::Agc,
    agc_s: hypr_agc::Agc,
    last_amp: Instant,
    recorder: Option<ActorRef<RecMsg>>,
    listen: Option<ActorRef<ListenMsg>>,
    last_mic: Option<Arc<[f32]>>,
    last_spk: Option<Arc<[f32]>>,
}

pub struct AudioProcessor {}
impl Actor for AudioProcessor {
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
            aec: hypr_aec::AEC::new().unwrap(),
            agc_m: hypr_agc::Agc::default(),
            agc_s: hypr_agc::Agc::default(),
            last_amp: Instant::now(),
            recorder: args.mixed_to.or(args.rec_to),
            listen: args.listen_tx,
            last_mic: None,
            last_spk: None,
        })
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match msg {
            ProcMsg::AttachRecorder(r) => st.recorder = Some(r),
            ProcMsg::AttachListen(l) => st.listen = Some(l),
            ProcMsg::Mic(mut c) => {
                st.agc_m.process(&mut c.data);
                let arc = Arc::<[f32]>::from(c.data);
                st.last_mic = Some(arc.clone());
                st.joiner.push_mic(arc);
                process_ready(st).await;
            }
            ProcMsg::Spk(mut c) => {
                st.agc_s.process(&mut c.data);
                let arc = Arc::<[f32]>::from(c.data);
                st.last_spk = Some(arc.clone());
                st.joiner.push_spk(arc);
                process_ready(st).await;
            }
        }
        Ok(())
    }
}

async fn process_ready(st: &mut ProcState) {
    while let Some((mic, spk)) = st.joiner.pop_pair() {
        let mic_out = st
            .aec
            .process_streaming(&mic, &spk)
            .unwrap_or_else(|_| mic.to_vec());

        if let Some(rec) = &st.recorder {
            let mixed: Vec<f32> = mic_out
                .iter()
                .zip(spk.iter())
                .map(|(m, s)| (m + s).clamp(-1.0, 1.0))
                .collect();
            rec.cast(RecMsg::Audio(mixed)).ok();
        }

        if let Some(list) = &st.listen {
            let mic_bytes = hypr_audio_utils::f32_to_i16_bytes(mic_out.into_iter());
            let spk_bytes = hypr_audio_utils::f32_to_i16_bytes(spk.iter().copied());
            list.cast(ListenMsg::Audio(mic_bytes.into(), spk_bytes.into()))
                .ok();
        }
    }

    if st.last_amp.elapsed() >= AUDIO_AMPLITUDE_THROTTLE {
        if let (Some(mic_data), Some(spk_data)) = (&st.last_mic, &st.last_spk) {
            if let Err(e) = SessionEvent::from((mic_data.as_ref(), spk_data.as_ref())).emit(&st.app)
            {
                tracing::error!("Failed to emit AudioAmplitude event: {:?}", e);
            }

            st.last_amp = Instant::now();
        }
    }
}

struct Joiner {
    mic: VecDeque<Arc<[f32]>>,
    spk: VecDeque<Arc<[f32]>>,
}

impl Joiner {
    fn new() -> Self {
        Self {
            mic: VecDeque::new(),
            spk: VecDeque::new(),
        }
    }

    fn push_mic(&mut self, data: Arc<[f32]>) {
        self.mic.push_back(data);
        if self.mic.len() > 10 {
            self.mic.pop_front();
        }
    }

    fn push_spk(&mut self, data: Arc<[f32]>) {
        self.spk.push_back(data);
        if self.spk.len() > 10 {
            self.spk.pop_front();
        }
    }

    fn pop_pair(&mut self) -> Option<(Arc<[f32]>, Arc<[f32]>)> {
        if !self.mic.is_empty() && !self.spk.is_empty() {
            let mic = self.mic.pop_front()?;
            let spk = self.spk.pop_front()?;
            Some((mic, spk))
        } else {
            None
        }
    }
}
