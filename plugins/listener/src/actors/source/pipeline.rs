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

type AudioPair = (Arc<[f32]>, Arc<[f32]>);
type BufferedAudio = (Arc<[f32]>, Arc<[f32]>, ChannelMode);

pub(in crate::actors) struct Pipeline {
    agc_mic: VadAgc,
    agc_spk: VadAgc,
    aec: Option<AEC>,
    joiner: Joiner,
    amplitude: AmplitudeEmitter,
    audio_buffer: AudioBuffer,
    backlog_quota: f32,
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
        }
    }

    pub(super) fn reset(&mut self) {
        self.joiner.reset();
        self.agc_mic = VadAgc::default().with_masking(true);
        self.agc_spk = VadAgc::default();
        if let Some(aec) = &mut self.aec {
            aec.reset();
        }
        self.amplitude.reset();
        self.audio_buffer.clear();
        self.backlog_quota = 0.0;
    }

    pub(super) fn ingest_mic(&mut self, chunk: AudioChunk) {
        let mut data = chunk.data;
        self.agc_mic.process(&mut data);
        self.amplitude.observe_mic(&data);
        let arc = Arc::<[f32]>::from(data);
        self.joiner.push_mic(arc);
    }

    pub(super) fn ingest_speaker(&mut self, chunk: AudioChunk) {
        let mut data = chunk.data;
        self.agc_spk.process(&mut data);
        self.amplitude.observe_spk(&data);
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

        let Some(cell) = registry::where_is(ListenerActor::name()) else {
            self.audio_buffer.push(processed_mic, processed_spk, mode);
            tracing::debug!(
                actor = ListenerActor::name(),
                buffered = self.audio_buffer.len(),
                "listener_unavailable_buffering"
            );
            return;
        };

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
            tracing::warn!(actor = ListenerActor::name(), "cast_failed");
        }
    }
}

struct AudioBuffer {
    buffer: VecDeque<BufferedAudio>,
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

    fn pop(&mut self) -> Option<BufferedAudio> {
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
    mic_smoothed: f32,
    spk_smoothed: f32,
    last_emit: Instant,
}

impl AmplitudeEmitter {
    /// Smoothing factor for exponential moving average.
    /// Lower values = more smoothing, slower response.
    /// Higher values = less smoothing, faster response.
    const SMOOTHING_ALPHA: f32 = 0.7;

    /// Minimum dB level (silence floor)
    const MIN_DB: f32 = -60.0;
    /// Maximum dB level (full scale)
    const MAX_DB: f32 = 0.0;

    fn new(app: tauri::AppHandle, session_id: String) -> Self {
        Self {
            app,
            session_id,
            mic_smoothed: 0.0,
            spk_smoothed: 0.0,
            last_emit: Instant::now() - AUDIO_AMPLITUDE_THROTTLE,
        }
    }

    fn reset(&mut self) {
        self.mic_smoothed = 0.0;
        self.spk_smoothed = 0.0;
        self.last_emit = Instant::now() - AUDIO_AMPLITUDE_THROTTLE;
    }

    fn observe_mic(&mut self, data: &[f32]) {
        let amplitude = Self::amplitude_from_chunk(data);
        self.mic_smoothed =
            (1.0 - Self::SMOOTHING_ALPHA) * self.mic_smoothed + Self::SMOOTHING_ALPHA * amplitude;
        self.emit_if_ready();
    }

    fn observe_spk(&mut self, data: &[f32]) {
        let amplitude = Self::amplitude_from_chunk(data);
        self.spk_smoothed =
            (1.0 - Self::SMOOTHING_ALPHA) * self.spk_smoothed + Self::SMOOTHING_ALPHA * amplitude;
        self.emit_if_ready();
    }

    fn emit_if_ready(&mut self) {
        if self.last_emit.elapsed() < AUDIO_AMPLITUDE_THROTTLE {
            return;
        }

        // Convert smoothed [0, 1] to [0, 1000] for transmission as u16
        let mic_level = (self.mic_smoothed * 1000.0) as u16;
        let spk_level = (self.spk_smoothed * 1000.0) as u16;

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

    /// Computes amplitude from audio chunk using RMS and dB conversion.
    /// Returns a normalized value in [0, 1] range.
    fn amplitude_from_chunk(chunk: &[f32]) -> f32 {
        if chunk.is_empty() {
            return 0.0;
        }

        // Compute RMS (Root Mean Square) - represents perceived loudness better than peak
        let sum_squares: f32 = chunk.iter().filter(|x| x.is_finite()).map(|&x| x * x).sum();
        let count = chunk.iter().filter(|x| x.is_finite()).count();
        if count == 0 {
            return 0.0;
        }
        let rms = (sum_squares / count as f32).sqrt();

        // Convert to dB (logarithmic scale matches human hearing)
        let db = if rms > 0.0 {
            20.0 * rms.log10()
        } else {
            Self::MIN_DB
        };

        // Normalize to [0, 1] range
        ((db - Self::MIN_DB) / (Self::MAX_DB - Self::MIN_DB)).clamp(0.0, 1.0)
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
    const MAX_SILENCE_CACHE_SIZE: usize = 20;

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
        self.silence_cache.clear();
    }

    fn get_silence(&mut self, len: usize) -> Arc<[f32]> {
        if self.silence_cache.len() >= Self::MAX_SILENCE_CACHE_SIZE
            && !self.silence_cache.contains_key(&len)
        {
            self.silence_cache.clear();
        }
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

    fn pop_pair(&mut self, mode: ChannelMode) -> Option<AudioPair> {
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
