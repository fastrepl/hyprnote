use serde::{Deserialize, Serialize};
use specta::Type;

#[allow(dead_code)]
pub mod v1 {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Word {
        pub id: String,
        pub transcript_id: String,
        pub text: String,
        pub start_ms: u64,
        pub end_ms: u64,
        pub confidence: f64,
        pub speaker: u32,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct SpeakerHint {
        pub id: String,
        pub transcript_id: String,
        pub speaker: u32,
        pub human_id: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Transcript {
        pub id: String,
        pub user_id: String,
        pub created_at: String,
        pub session_id: String,
        pub started_at: u64,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub ended_at: Option<u64>,
        #[serde(default)]
        pub words: Vec<Word>,
        #[serde(default)]
        pub speaker_hints: Vec<SpeakerHint>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct TranscriptFile {
        pub transcripts: Vec<Transcript>,
    }

    impl TranscriptFile {
        pub fn migrate(self) -> super::v2::TranscriptFile {
            super::v2::TranscriptFile {
                transcripts: self
                    .transcripts
                    .into_iter()
                    .map(|t| super::v2::Transcript {
                        id: t.id,
                        user_id: t.user_id,
                        created_at: t.created_at,
                        session_id: t.session_id,
                        started_at: t.started_at,
                        ended_at: t.ended_at,
                        words: t
                            .words
                            .into_iter()
                            .map(|w| super::v2::Word {
                                id: w.id,
                                transcript_id: w.transcript_id,
                                text: w.text,
                                start_ms: w.start_ms,
                                end_ms: w.end_ms,
                                confidence: w.confidence,
                                speaker: w.speaker,
                            })
                            .collect(),
                        speaker_hints: t
                            .speaker_hints
                            .into_iter()
                            .map(|h| super::v2::SpeakerHint {
                                id: h.id,
                                transcript_id: h.transcript_id,
                                speaker: h.speaker,
                                human_id: h.human_id,
                            })
                            .collect(),
                    })
                    .collect(),
            }
        }
    }
}

pub mod v2 {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize, Type)]
    pub struct Word {
        pub id: String,
        pub transcript_id: String,
        pub text: String,
        pub start_ms: u64,
        pub end_ms: u64,
        pub confidence: f64,
        pub speaker: u32,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, Type)]
    pub struct SpeakerHint {
        pub id: String,
        pub transcript_id: String,
        pub speaker: u32,
        pub human_id: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, Type)]
    pub struct Transcript {
        pub id: String,
        pub user_id: String,
        pub created_at: String,
        pub session_id: String,
        pub started_at: u64,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub ended_at: Option<u64>,
        #[serde(default)]
        pub words: Vec<Word>,
        #[serde(default)]
        pub speaker_hints: Vec<SpeakerHint>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, Type)]
    pub struct TranscriptFile {
        pub transcripts: Vec<Transcript>,
    }
}

pub use v2::TranscriptFile;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrate_v1_to_v2() {
        let v1_file = v1::TranscriptFile {
            transcripts: vec![v1::Transcript {
                id: "t-001".to_string(),
                user_id: "local".to_string(),
                created_at: "2026-01-25T00:00:00Z".to_string(),
                session_id: "s-001".to_string(),
                started_at: 0,
                ended_at: Some(1000),
                words: vec![],
                speaker_hints: vec![],
            }],
        };

        let v2_file = v1_file.migrate();
        assert_eq!(v2_file.transcripts.len(), 1);
        assert_eq!(v2_file.transcripts[0].id, "t-001");
    }

    #[test]
    fn deserialize_v1_json() {
        let json = r#"{
            "transcripts": [{
                "id": "t-001",
                "user_id": "local",
                "created_at": "2026-01-25T00:00:00Z",
                "session_id": "s-001",
                "started_at": 0,
                "words": [],
                "speaker_hints": []
            }]
        }"#;

        let file: v1::TranscriptFile = serde_json::from_str(json).unwrap();
        assert_eq!(file.transcripts[0].id, "t-001");
    }
}
