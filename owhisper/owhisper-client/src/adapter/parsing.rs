use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse, Word};

pub fn parse_speaker_id(value: &str) -> Option<usize> {
    if let Ok(n) = value.parse::<usize>() {
        return Some(n);
    }

    value
        .trim_start_matches(|c: char| !c.is_ascii_digit())
        .parse()
        .ok()
}

pub fn ms_to_secs(ms: u64) -> f64 {
    ms as f64 / 1000.0
}

pub fn ms_to_secs_opt(ms: Option<u64>) -> f64 {
    ms.map(ms_to_secs).unwrap_or(0.0)
}

pub trait HasTimeSpan {
    fn start_time(&self) -> f64;
    fn end_time(&self) -> f64;
}

impl HasTimeSpan for Word {
    fn start_time(&self) -> f64 {
        self.start
    }

    fn end_time(&self) -> f64 {
        self.end
    }
}

pub fn calculate_time_span<T: HasTimeSpan>(words: &[T]) -> (f64, f64) {
    match (words.first(), words.last()) {
        (Some(first), Some(last)) => {
            let start = first.start_time();
            let end = last.end_time();
            (start, end - start)
        }
        _ => (0.0, 0.0),
    }
}

pub fn build_transcript_response(
    transcript: String,
    words: Vec<Word>,
    is_final: bool,
    speech_final: bool,
    from_finalize: bool,
    languages: Vec<String>,
    channel_index: Vec<i32>,
) -> StreamResponse {
    let (start, duration) = calculate_time_span(&words);

    let channel = Channel {
        alternatives: vec![Alternatives {
            transcript,
            words,
            confidence: 1.0,
            languages,
        }],
    };

    StreamResponse::TranscriptResponse {
        is_final,
        speech_final,
        from_finalize,
        start,
        duration,
        channel,
        metadata: Metadata::default(),
        channel_index,
    }
}

pub struct TranscriptResponseBuilder {
    transcript: String,
    words: Vec<Word>,
    is_final: bool,
    speech_final: bool,
    from_finalize: bool,
    languages: Vec<String>,
    channel_index: Vec<i32>,
    start: Option<f64>,
    duration: Option<f64>,
}

impl TranscriptResponseBuilder {
    pub fn new(transcript: impl Into<String>) -> Self {
        Self {
            transcript: transcript.into(),
            words: Vec::new(),
            is_final: false,
            speech_final: false,
            from_finalize: false,
            languages: Vec::new(),
            channel_index: vec![0],
            start: None,
            duration: None,
        }
    }

    pub fn words(mut self, words: Vec<Word>) -> Self {
        self.words = words;
        self
    }

    pub fn is_final(mut self, is_final: bool) -> Self {
        self.is_final = is_final;
        self
    }

    pub fn speech_final(mut self, speech_final: bool) -> Self {
        self.speech_final = speech_final;
        self
    }

    pub fn from_finalize(mut self, from_finalize: bool) -> Self {
        self.from_finalize = from_finalize;
        self
    }

    pub fn languages(mut self, languages: Vec<String>) -> Self {
        self.languages = languages;
        self
    }

    pub fn channel_index(mut self, channel_index: Vec<i32>) -> Self {
        self.channel_index = channel_index;
        self
    }

    pub fn start(mut self, start: f64) -> Self {
        self.start = Some(start);
        self
    }

    pub fn duration(mut self, duration: f64) -> Self {
        self.duration = Some(duration);
        self
    }

    pub fn build(self) -> StreamResponse {
        let (computed_start, computed_duration) = calculate_time_span(&self.words);
        let start = self.start.unwrap_or(computed_start);
        let duration = self.duration.unwrap_or(computed_duration);

        let channel = Channel {
            alternatives: vec![Alternatives {
                transcript: self.transcript,
                words: self.words,
                confidence: 1.0,
                languages: self.languages,
            }],
        };

        StreamResponse::TranscriptResponse {
            is_final: self.is_final,
            speech_final: self.speech_final,
            from_finalize: self.from_finalize,
            start,
            duration,
            channel,
            metadata: Metadata::default(),
            channel_index: self.channel_index,
        }
    }
}

pub struct WordBuilder {
    word: String,
    start: f64,
    end: f64,
    confidence: f64,
    speaker: Option<i32>,
    punctuated_word: Option<String>,
    language: Option<String>,
}

impl WordBuilder {
    pub fn new(word: impl Into<String>) -> Self {
        let word = word.into();
        Self {
            punctuated_word: Some(word.clone()),
            word,
            start: 0.0,
            end: 0.0,
            confidence: 1.0,
            speaker: None,
            language: None,
        }
    }

    pub fn start(mut self, start: f64) -> Self {
        self.start = start;
        self
    }

    pub fn end(mut self, end: f64) -> Self {
        self.end = end;
        self
    }

    pub fn confidence(mut self, confidence: f64) -> Self {
        self.confidence = confidence;
        self
    }

    pub fn speaker(mut self, speaker: Option<i32>) -> Self {
        self.speaker = speaker;
        self
    }

    pub fn language(mut self, language: Option<String>) -> Self {
        self.language = language;
        self
    }

    pub fn build(self) -> Word {
        Word {
            word: self.word,
            start: self.start,
            end: self.end,
            confidence: self.confidence,
            speaker: self.speaker,
            punctuated_word: self.punctuated_word,
            language: self.language,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_speaker_id_numeric() {
        assert_eq!(parse_speaker_id("0"), Some(0));
        assert_eq!(parse_speaker_id("1"), Some(1));
        assert_eq!(parse_speaker_id("42"), Some(42));
    }

    #[test]
    fn test_parse_speaker_id_prefixed() {
        assert_eq!(parse_speaker_id("SPEAKER_0"), Some(0));
        assert_eq!(parse_speaker_id("SPEAKER_1"), Some(1));
        assert_eq!(parse_speaker_id("speaker_2"), Some(2));
    }

    #[test]
    fn test_parse_speaker_id_invalid() {
        assert_eq!(parse_speaker_id(""), None);
        assert_eq!(parse_speaker_id("abc"), None);
    }

    #[test]
    fn test_ms_to_secs() {
        assert_eq!(ms_to_secs(0), 0.0);
        assert_eq!(ms_to_secs(1000), 1.0);
        assert_eq!(ms_to_secs(1500), 1.5);
    }

    #[test]
    fn test_ms_to_secs_opt() {
        assert_eq!(ms_to_secs_opt(None), 0.0);
        assert_eq!(ms_to_secs_opt(Some(1000)), 1.0);
        assert_eq!(ms_to_secs_opt(Some(2500)), 2.5);
    }

    #[test]
    fn test_calculate_time_span_empty() {
        let words: Vec<Word> = vec![];
        assert_eq!(calculate_time_span(&words), (0.0, 0.0));
    }

    #[test]
    fn test_calculate_time_span_single() {
        let words = vec![WordBuilder::new("hello").start(1.0).end(2.0).build()];
        assert_eq!(calculate_time_span(&words), (1.0, 1.0));
    }

    #[test]
    fn test_calculate_time_span_multiple() {
        let words = vec![
            WordBuilder::new("hello").start(1.0).end(2.0).build(),
            WordBuilder::new("world").start(2.5).end(3.5).build(),
        ];
        assert_eq!(calculate_time_span(&words), (1.0, 2.5));
    }

    #[test]
    fn test_word_builder() {
        let word = WordBuilder::new("test")
            .start(1.5)
            .end(2.5)
            .confidence(0.95)
            .speaker(Some(1))
            .language(Some("en".to_string()))
            .build();

        assert_eq!(word.word, "test");
        assert_eq!(word.start, 1.5);
        assert_eq!(word.end, 2.5);
        assert_eq!(word.confidence, 0.95);
        assert_eq!(word.speaker, Some(1));
        assert_eq!(word.punctuated_word, Some("test".to_string()));
        assert_eq!(word.language, Some("en".to_string()));
    }
}
