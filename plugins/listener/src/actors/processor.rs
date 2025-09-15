use std::{
    collections::VecDeque,
    sync::Arc,
    time::{Duration, Instant},
};

use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};
use tauri_specta::Event;

use crate::{
    actors::{AudioChunk, ListenMsg, RecMsg},
    SessionEvent,
};

const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);

pub enum ProcMsg {
    Mic(AudioChunk),
    Spk(AudioChunk),
    AttachListen(ActorRef<ListenMsg>),
    AttachRecorder(ActorRef<RecMsg>),
}

pub struct ProcArgs {
    pub app: tauri::AppHandle,
}

pub struct ProcState {
    app: tauri::AppHandle,
    aec: hypr_aec::AEC,
    agc_m: hypr_agc::Agc,
    agc_s: hypr_agc::Agc,
    joiner: Joiner,
    last_mic: Option<Arc<[f32]>>,
    last_spk: Option<Arc<[f32]>>,
    last_amp: Instant,
    listen: Option<ActorRef<ListenMsg>>,
    recorder: Option<ActorRef<RecMsg>>,
    mic_recorder: Option<ActorRef<RecMsg>>,
    speaker_recorder: Option<ActorRef<RecMsg>>,
}

pub struct AudioProcessor {}

impl AudioProcessor {
    pub fn name() -> ActorName {
        "audio_processor".into()
    }
}

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
            last_mic: None,
            last_spk: None,
            last_amp: Instant::now(),
            listen: None,
            recorder: None,
            mic_recorder: None,
            speaker_recorder: None,
        })
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match msg {
            ProcMsg::AttachListen(actor) => st.listen = Some(actor),
            ProcMsg::AttachRecorder(actor) => st.recorder = Some(actor),
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
        let mic = st
            .aec
            .process_streaming(&mic, &spk)
            .unwrap_or_else(|_| mic.to_vec());

        {
            if let Some(mic_rec) = &st.mic_recorder {
                mic_rec.cast(RecMsg::Audio(mic.clone())).ok();
            }
            if let Some(spk_rec) = &st.speaker_recorder {
                spk_rec.cast(RecMsg::Audio(spk.to_vec())).ok();
            }

            if let Some(rec) = &st.recorder {
                let mixed: Vec<f32> = mic
                    .iter()
                    .zip(spk.iter())
                    .map(|(m, s)| (m + s).clamp(-1.0, 1.0))
                    .collect();
                rec.cast(RecMsg::Audio(mixed)).ok();
            }
        }

        if let Some(actor) = &st.listen {
            let mic_bytes = hypr_audio_utils::f32_to_i16_bytes(mic.into_iter());
            let spk_bytes = hypr_audio_utils::f32_to_i16_bytes(spk.iter().copied());

            actor
                .cast(ListenMsg::Audio(mic_bytes.into(), spk_bytes.into()))
                .ok();
        }
    }

    if st.last_amp.elapsed() >= AUDIO_AMPLITUDE_THROTTLE {
        if let (Some(mic_data), Some(spk_data)) = (&st.last_mic, &st.last_spk) {
            if let Err(e) = SessionEvent::from((mic_data.as_ref(), spk_data.as_ref())).emit(&st.app)
            {
                tracing::error!("{:?}", e);
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
