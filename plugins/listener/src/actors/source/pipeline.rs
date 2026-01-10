use std::{
    collections::{HashMap, VecDeque},
    sync::Arc,
    time::{Duration, Instant},
};

use ractor::{ActorRef, registry};
use tauri_specta::Event;

use crate::{
    SessionDataEvent,
    actors::{AudioChunk, ChannelMode, ListenerActor, ListenerMsg, RecMsg, RecorderActor},
};
use hypr_aec::AEC;
use hypr_agc::VadAgc;
use hypr_audio_utils::f32_to_i16_bytes;

const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);
const MAX_BUFFER_CHUNKS: usize = 150;

const BUFFER_LOG_INTERVAL: usize = 50;

pub(in crate::actors) struct Pipeline {
    agc_mic: VadAgc,
    agc_spk: VadAgc,
    aec: Option<AEC>,
    joiner: Joiner,
    amplitude: AmplitudeEmitter,
    audio_buffer: AudioBuffer,
    backlog_quota: f32,
    buffer_log_counter: usize,
}

impl Pipeline {
    const BACKLOG_QUOTA_INCREMENT: f32 = 0.25;
    const MAX_BACKLOG_QUOTA: f32 = 2.0;

    pub(super) fn new(app: tauri::AppHandle, session_id: String) -> Self {
        Self {
            agc_mic: VadAgc::default().with_masking(true),
            agc_spk: VadAgc::default(),
            aec: None,
            joiner: Joiner::new(),
            amplitude: AmplitudeEmitter::new(app, session_id),
            audio_buffer: AudioBuffer::new(MAX_BUFFER_CHUNKS),
            backlog_quota: 0.0,
            buffer_log_counter: 0,
        }
    }

    pub(super) fn reset(&mut self) {
        let buffered_chunks = self.audio_buffer.len();
        let mic_queue = self.joiner.mic.len();
        let spk_queue = self.joiner.spk.len();

        self.joiner.reset();
        self.agc_mic = VadAgc::default().with_masking(true);
        self.agc_spk = VadAgc::default();
        if let Some(aec) = &mut self.aec {
            aec.reset();
        }
        self.amplitude.reset();
        self.audio_buffer.clear();
        self.backlog_quota = 0.0;
        self.buffer_log_counter = 0;

        tracing::info!(
            buffered_chunks_cleared = buffered_chunks,
            mic_queue_cleared = mic_queue,
            spk_queue_cleared = spk_queue,
            "pipeline_reset"
        );
    }

    pub(super) fn ingest_mic(&mut self, chunk: AudioChunk) {
        let mut data = chunk.data;
        self.agc_mic.process(&mut data);
        let arc = Arc::<[f32]>::from(data);
        self.joiner.push_mic(arc);
    }

    pub(super) fn ingest_speaker(&mut self, chunk: AudioChunk) {
        let mut data = chunk.data;
        self.agc_spk.process(&mut data);
        let arc = Arc::<[f32]>::from(data);
        self.joiner.push_spk(arc);
    }

    pub(super) fn flush(&mut self, mode: ChannelMode) {
        while let Some((mic, spk)) = self.joiner.pop_pair(mode) {
            self.dispatch(mic, spk, mode);
        }
    }

    fn dispatch(&mut self, mic: Arc<[f32]>, spk: Arc<[f32]>, mode: ChannelMode) {
        let (processed_mic, processed_spk) = if let Some(aec) = &mut self.aec {
            match aec.process_streaming(&mic, &spk) {
                Ok(processed) => {
                    let processed_arc = Arc::<[f32]>::from(processed);
                    (processed_arc, Arc::clone(&spk))
                }
                Err(e) => {
                    tracing::warn!(error = ?e, "aec_failed");
                    (mic, spk)
                }
            }
        } else {
            (mic, spk)
        };

        if let Some(cell) = registry::where_is(RecorderActor::name()) {
            let actor: ActorRef<RecMsg> = cell.into();
            let result = match mode {
                ChannelMode::MicOnly => actor.cast(RecMsg::AudioSingle(Arc::clone(&processed_mic))),
                ChannelMode::SpeakerOnly => {
                    actor.cast(RecMsg::AudioSingle(Arc::clone(&processed_spk)))
                }
                ChannelMode::MicAndSpeaker => actor.cast(RecMsg::AudioDual(
                    Arc::clone(&processed_mic),
                    Arc::clone(&processed_spk),
                )),
            };
            if let Err(e) = result {
                tracing::error!(error = ?e, "failed_to_send_audio_to_recorder");
            }
        }

        self.amplitude
            .observe(Arc::clone(&processed_mic), Arc::clone(&processed_spk));

        let Some(cell) = registry::where_is(ListenerActor::name()) else {
            self.audio_buffer.push(processed_mic, processed_spk, mode);
            self.buffer_log_counter += 1;
            if self.buffer_log_counter == 1 || self.buffer_log_counter % BUFFER_LOG_INTERVAL == 0 {
                tracing::warn!(
                    buffered = self.audio_buffer.len(),
                    capacity = MAX_BUFFER_CHUNKS,
                    chunks_since_last_log = self.buffer_log_counter,
                    "listener_unavailable_buffering"
                );
            }
            return;
        };

        if self.buffer_log_counter > 0 {
            self.buffer_log_counter = 0;
        }

        let actor: ActorRef<ListenerMsg> = cell.into();

        self.flush_buffer_to_listener(&actor, mode);

        self.send_to_listener(&actor, &processed_mic, &processed_spk, mode);
    }

    fn flush_buffer_to_listener(&mut self, actor: &ActorRef<ListenerMsg>, mode: ChannelMode) {
        if !self.audio_buffer.is_empty() {
            self.backlog_quota =
                (self.backlog_quota + Self::BACKLOG_QUOTA_INCREMENT).min(Self::MAX_BACKLOG_QUOTA);

            while self.backlog_quota >= 1.0 {
                let Some((mic, spk, buffered_mode)) = self.audio_buffer.pop() else {
                    break;
                };

                if buffered_mode == mode {
                    self.send_to_listener(actor, &mic, &spk, mode);
                    self.backlog_quota -= 1.0;
                }
            }
        }
    }

    fn send_to_listener(
        &self,
        actor: &ActorRef<ListenerMsg>,
        mic: &Arc<[f32]>,
        spk: &Arc<[f32]>,
        mode: ChannelMode,
    ) {
        let result = match mode {
            ChannelMode::MicOnly => {
                let bytes = f32_to_i16_bytes(mic.iter().copied());
                actor.cast(ListenerMsg::AudioSingle(bytes))
            }
            ChannelMode::SpeakerOnly => {
                let bytes = f32_to_i16_bytes(spk.iter().copied());
                actor.cast(ListenerMsg::AudioSingle(bytes))
            }
            ChannelMode::MicAndSpeaker => {
                let mic_bytes = f32_to_i16_bytes(mic.iter().copied());
                let spk_bytes = f32_to_i16_bytes(spk.iter().copied());
                actor.cast(ListenerMsg::AudioDual(mic_bytes, spk_bytes))
            }
        };

        if result.is_err() {
            let message_type = match mode {
                ChannelMode::MicOnly | ChannelMode::SpeakerOnly => "AudioSingle",
                ChannelMode::MicAndSpeaker => "AudioDual",
            };
            tracing::warn!(
                target_actor = ListenerActor::name(),
                message_type,
                ?mode,
                "listener_cast_failed"
            );
        }
    }
}

struct AudioBuffer {
    buffer: VecDeque<(Arc<[f32]>, Arc<[f32]>, ChannelMode)>,
    max_size: usize,
}

impl AudioBuffer {
    fn new(max_size: usize) -> Self {
        Self {
            buffer: VecDeque::new(),
            max_size,
        }
    }

    fn push(&mut self, mic: Arc<[f32]>, spk: Arc<[f32]>, mode: ChannelMode) {
        if self.buffer.len() >= self.max_size {
            self.buffer.pop_front();
            tracing::warn!("audio_buffer_overflow");
        }
        self.buffer.push_back((mic, spk, mode));
    }

    fn pop(&mut self) -> Option<(Arc<[f32]>, Arc<[f32]>, ChannelMode)> {
        self.buffer.pop_front()
    }

    fn len(&self) -> usize {
        self.buffer.len()
    }

    fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    fn clear(&mut self) {
        self.buffer.clear();
    }
}

struct AmplitudeEmitter {
    app: tauri::AppHandle,
    session_id: String,
    last_mic: Option<Arc<[f32]>>,
    last_spk: Option<Arc<[f32]>>,
    last_emit: Instant,
}

impl AmplitudeEmitter {
    fn new(app: tauri::AppHandle, session_id: String) -> Self {
        Self {
            app,
            session_id,
            last_mic: None,
            last_spk: None,
            last_emit: Instant::now() - AUDIO_AMPLITUDE_THROTTLE,
        }
    }

    fn reset(&mut self) {
        self.last_mic = None;
        self.last_spk = None;
        self.last_emit = Instant::now() - AUDIO_AMPLITUDE_THROTTLE;
    }

    fn observe(&mut self, mic: Arc<[f32]>, spk: Arc<[f32]>) {
        self.last_mic = Some(mic);
        self.last_spk = Some(spk);
        self.emit_if_ready();
    }

    fn emit_if_ready(&mut self) {
        if self.last_emit.elapsed() < AUDIO_AMPLITUDE_THROTTLE {
            return;
        }

        let (Some(mic), Some(spk)) = (&self.last_mic, &self.last_spk) else {
            return;
        };

        let mic_level = Self::amplitude_from_chunk(mic.as_ref());
        let spk_level = Self::amplitude_from_chunk(spk.as_ref());

        if let Err(error) = (SessionDataEvent::AudioAmplitude {
            session_id: self.session_id.clone(),
            mic: mic_level,
            speaker: spk_level,
        })
        .emit(&self.app)
        {
            tracing::error!(error = ?error, "session_data_event_emit_failed");
        }

        self.last_emit = Instant::now();
    }

    fn amplitude_from_chunk(chunk: &[f32]) -> u16 {
        (chunk
            .iter()
            .map(|&x| x.abs())
            .filter(|x| x.is_finite())
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0)
            * 100.0) as u16
    }
}

struct Joiner {
    mic: VecDeque<Arc<[f32]>>,
    spk: VecDeque<Arc<[f32]>>,
    silence_cache: HashMap<usize, Arc<[f32]>>,
}

impl Joiner {
    const MAX_LAG: usize = 4;
    const MAX_QUEUE_SIZE: usize = 30;

    fn new() -> Self {
        Self {
            mic: VecDeque::new(),
            spk: VecDeque::new(),
            silence_cache: HashMap::new(),
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
        if self.mic.front().is_some() && self.spk.front().is_some() {
            return Some((self.mic.pop_front()?, self.spk.pop_front()?));
        }

        match mode {
            ChannelMode::MicOnly => {
                if let Some(mic) = self.mic.pop_front() {
                    let spk = self.get_silence(mic.len());
                    return Some((mic, spk));
                }
            }
            ChannelMode::SpeakerOnly => {
                if let Some(spk) = self.spk.pop_front() {
                    let mic = self.get_silence(spk.len());
                    return Some((mic, spk));
                }
            }
            ChannelMode::MicAndSpeaker => {
                if self.mic.front().is_some()
                    && self.spk.is_empty()
                    && self.mic.len() > Self::MAX_LAG
                {
                    let mic = self.mic.pop_front()?;
                    let spk = self.get_silence(mic.len());
                    return Some((mic, spk));
                }
                if self.spk.front().is_some()
                    && self.mic.is_empty()
                    && self.spk.len() > Self::MAX_LAG
                {
                    let spk = self.spk.pop_front()?;
                    let mic = self.get_silence(spk.len());
                    return Some((mic, spk));
                }
            }
        }

        None
    }
}
