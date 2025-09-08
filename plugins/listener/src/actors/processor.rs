use std::{
    collections::BTreeMap,
    time::{Duration, Instant},
};

use ractor::{Actor, ActorProcessingErr, ActorRef};
use tauri_specta::Event;

use crate::{
    actors::{AudioChunk, ListenMsg, RecMsg},
    SessionEvent,
};

const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);
const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(60 * 15);

pub enum ProcMsg {
    Mic(AudioChunk),
    Spk(AudioChunk),
    MuteMic(bool),
    MuteSpk(bool),
    AttachRecorder(ActorRef<RecMsg>),
    AttachListen(ActorRef<ListenMsg>),
}

pub struct ProcArgs {
    pub app: tauri::AppHandle,
    pub rec_enabled: bool,
    pub amp_throttle: Duration,
    pub mixed_to: Option<ActorRef<RecMsg>>,
    pub rec_to: Option<ActorRef<RecMsg>>,
    pub listen_tx: Option<ActorRef<ListenMsg>>,
    pub mic_mute: bool,
    pub spk_mute: bool,
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
    mic_mute: bool,
    spk_mute: bool,
}

pub struct AudioProcessor {
    pub app: tauri::AppHandle,
}

impl Actor for AudioProcessor {
    type Msg = ProcMsg;
    type State = ProcState;
    type Arguments = ProcArgs;

    fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> impl std::future::Future<Output = Result<Self::State, ActorProcessingErr>> + Send {
        async move {
            Ok(ProcState {
                app: args.app.clone(),
                joiner: Joiner::new(),
                aec: hypr_aec::AEC::new().unwrap(),
                agc_m: hypr_agc::Agc::default(),
                agc_s: hypr_agc::Agc::default(),
                last_amp: Instant::now(),
                recorder: args.mixed_to.or(args.rec_to),
                listen: args.listen_tx,
                mic_mute: args.mic_mute,
                spk_mute: args.spk_mute,
            })
        }
    }

    fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> impl std::future::Future<Output = Result<(), ActorProcessingErr>> + Send {
        async move {
            match msg {
                ProcMsg::AttachRecorder(r) => st.recorder = Some(r),
                ProcMsg::AttachListen(l) => st.listen = Some(l),
                ProcMsg::MuteMic(v) => st.mic_mute = v,
                ProcMsg::MuteSpk(v) => st.spk_mute = v,
                ProcMsg::Mic(mut c) => {
                    if st.mic_mute {
                        c.data.fill(0.0);
                    }
                    st.agc_m.process(&mut c.data);
                    st.joiner.push_mic(c);
                    process_ready(st).await;
                }
                ProcMsg::Spk(mut c) => {
                    if st.spk_mute {
                        c.data.fill(0.0);
                    }
                    st.agc_s.process(&mut c.data);
                    st.joiner.push_spk(c);
                    process_ready(st).await;
                }
            }
            Ok(())
        }
    }
}

async fn process_ready(st: &mut ProcState) {
    while let Some((mut mic, mut spk)) = st.joiner.pop_pair() {
        let mic_out = st
            .aec
            .process_streaming(&mic.data, &spk.data)
            .unwrap_or(mic.data.clone());
        if st.last_amp.elapsed() >= AUDIO_AMPLITUDE_THROTTLE {
            SessionEvent::from((&mic_out, &spk.data)).emit(&st.app).ok();
            st.last_amp = Instant::now();
        }
        if let Some(rec) = &st.recorder {
            let mixed: Vec<f32> = mic_out
                .iter()
                .zip(spk.data.iter())
                .map(|(m, s)| (m + s).clamp(-1.0, 1.0))
                .collect();
            rec.cast(RecMsg::Mixed(mixed)).ok();
        }
        if let Some(list) = &st.listen {
            let mic_bytes = hypr_audio_utils::f32_to_i16_bytes(mic_out.into_iter());
            let spk_bytes = hypr_audio_utils::f32_to_i16_bytes(spk.data.into_iter());
            list.cast(ListenMsg::Audio(mic_bytes.into(), spk_bytes.into()))
                .ok();
        }
    }
}

struct Joiner {
    next: u64,
    mic: BTreeMap<u64, Vec<f32>>,
    spk: BTreeMap<u64, Vec<f32>>,
}
impl Joiner {
    fn new() -> Self {
        Self {
            next: 0,
            mic: BTreeMap::new(),
            spk: BTreeMap::new(),
        }
    }
    fn push_mic(&mut self, c: AudioChunk) {
        self.mic.insert(c.seq, c.data);
    }
    fn push_spk(&mut self, c: AudioChunk) {
        self.spk.insert(c.seq, c.data);
    }
    fn pop_pair(&mut self) -> Option<(AudioChunk, AudioChunk)> {
        let seq = self.next;
        match (self.mic.remove(&seq), self.spk.remove(&seq)) {
            (Some(m), Some(s)) => {
                self.next += 1;
                Some((AudioChunk { seq, data: m }, AudioChunk { seq, data: s }))
            }
            _ => None,
        }
    }
}
