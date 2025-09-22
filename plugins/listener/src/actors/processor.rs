use std::{
    collections::VecDeque,
    sync::Arc,
    time::{Duration, Instant},
};

use ractor::{registry, Actor, ActorName, ActorProcessingErr, ActorRef};
use tauri_specta::Event;

use crate::{
    actors::{AudioChunk, ListenerActor, ListenerMsg, RecMsg, RecorderActor},
    SessionEvent,
};

const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);

pub enum ProcMsg {
    Mic(AudioChunk),
    Speaker(AudioChunk),
    Mixed(AudioChunk),
}

pub struct ProcArgs {
    pub app: tauri::AppHandle,
}

pub struct ProcState {
    app: tauri::AppHandle,
    agc_m: hypr_agc::Agc,
    agc_s: hypr_agc::Agc,
    joiner: Joiner,
    last_mic: Option<Arc<[f32]>>,
    last_spk: Option<Arc<[f32]>>,
    last_amp: Instant,
}

pub struct ProcessorActor {}

impl ProcessorActor {
    pub fn name() -> ActorName {
        "processor_actor".into()
    }
}

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
            last_mic: None,
            last_spk: None,
            last_amp: Instant::now(),
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
                st.last_mic = Some(arc.clone());
                st.joiner.push_mic(arc);
                process_ready(st).await;
            }
            ProcMsg::Speaker(mut c) => {
                st.agc_s.process(&mut c.data);
                let arc = Arc::<[f32]>::from(c.data);
                st.last_spk = Some(arc.clone());
                st.joiner.push_spk(arc);
                process_ready(st).await;
            }
            ProcMsg::Mixed(mut c) => {
                st.agc_m.process(&mut c.data);

                let empty_arc = Arc::<[f32]>::from(vec![0.0; c.data.len()]);
                let arc = Arc::<[f32]>::from(c.data);

                st.last_mic = Some(empty_arc.clone());
                st.last_spk = Some(arc.clone());
                st.joiner.push_mic(empty_arc.clone());
                st.joiner.push_spk(arc);
                process_ready(st).await;
            }
        }
        Ok(())
    }
}

async fn process_ready(st: &mut ProcState) {
    while let Some((mic, spk)) = st.joiner.pop_pair() {
        {
            if let Some(cell) = registry::where_is(RecorderActor::name()) {
                let mixed: Vec<f32> = mic
                    .iter()
                    .zip(spk.iter())
                    .map(|(m, s)| (m + s).clamp(-1.0, 1.0))
                    .collect();

                let actor: ActorRef<RecMsg> = cell.into();
                actor.cast(RecMsg::Audio(mixed)).ok();
            }
        }

        if let Some(cell) = registry::where_is(ListenerActor::name()) {
            let mic_bytes = hypr_audio_utils::f32_to_i16_bytes(mic.iter().copied());
            let spk_bytes = hypr_audio_utils::f32_to_i16_bytes(spk.iter().copied());

            let actor: ActorRef<ListenerMsg> = cell.into();
            actor
                .cast(ListenerMsg::Audio(mic_bytes.into(), spk_bytes.into()))
                .ok();
        }
    }

    if st.last_amp.elapsed() >= AUDIO_AMPLITUDE_THROTTLE {
        if let (Some(mic_data), Some(spk_data)) = (&st.last_mic, &st.last_spk) {
            let mic_sum = mic_data.iter().sum::<f32>();
            let spk_sum = spk_data.iter().sum::<f32>();
            tracing::info!("mic_sum: {} spk_sum: {}", mic_sum, spk_sum);

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
            tracing::warn!("mic_queue_overflow");
            self.mic.pop_front();
        }
    }

    fn push_spk(&mut self, data: Arc<[f32]>) {
        self.spk.push_back(data);
        if self.spk.len() > 10 {
            tracing::warn!("spk_queue_overflow");
            self.spk.pop_front();
        }
    }

    fn pop_pair(&mut self) -> Option<(Arc<[f32]>, Arc<[f32]>)> {
        let mic_empty = self.mic.is_empty();
        let spk_empty = self.spk.is_empty();

        match (mic_empty, spk_empty) {
            (true, true) => None,
            (true, false) => {
                let spk = self.spk.pop_front()?;
                let mic = Arc::<[f32]>::from(vec![0.0; spk.len()]);
                Some((mic, spk))
            }
            (false, true) => {
                let mic = self.mic.pop_front()?;
                let spk = Arc::<[f32]>::from(vec![0.0; mic.len()]);
                Some((mic, spk))
            }
            (false, false) => {
                let mic = self.mic.pop_front()?;
                let spk = self.spk.pop_front()?;
                Some((mic, spk))
            }
        }
    }
}
