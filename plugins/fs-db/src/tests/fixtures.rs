use std::fs;
use std::path::Path;

use semver::Version;
use tempfile::TempDir;

use crate::version;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(non_camel_case_types)]
pub enum AppVersion {
    V1_0_1,
    V1_0_2,
}

impl AppVersion {
    pub fn to_semver(&self) -> Version {
        match self {
            AppVersion::V1_0_1 => Version::parse("1.0.1").unwrap(),
            AppVersion::V1_0_2 => Version::parse("1.0.2").unwrap(),
        }
    }

    pub fn uses_underscore_transcript(&self) -> bool {
        matches!(self, AppVersion::V1_0_1)
    }

    pub fn sessions_in_root(&self) -> bool {
        matches!(self, AppVersion::V1_0_1)
    }
}

pub struct VersionedFixture {
    pub version: AppVersion,
    temp_dir: TempDir,
}

impl VersionedFixture {
    pub fn new(version: AppVersion) -> std::io::Result<Self> {
        let temp_dir = TempDir::new()?;
        version::write_version(temp_dir.path(), &version.to_semver())
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
        Ok(Self { version, temp_dir })
    }

    pub fn new_fresh() -> std::io::Result<Self> {
        let temp_dir = TempDir::new()?;
        Ok(Self {
            version: AppVersion::V1_0_2,
            temp_dir,
        })
    }

    pub fn new_with_sqlite() -> std::io::Result<Self> {
        let temp_dir = TempDir::new()?;
        fs::write(temp_dir.path().join("db.sqlite"), "")?;
        Ok(Self {
            version: AppVersion::V1_0_1,
            temp_dir,
        })
    }

    pub fn path(&self) -> &Path {
        self.temp_dir.path()
    }

    pub fn file_exists(&self, relative_path: &str) -> bool {
        self.path().join(relative_path).exists()
    }

    #[allow(dead_code)]
    pub fn read_file(&self, relative_path: &str) -> std::io::Result<String> {
        fs::read_to_string(self.path().join(relative_path))
    }

    #[allow(dead_code)]
    pub fn read_json(&self, relative_path: &str) -> std::io::Result<serde_json::Value> {
        let content = self.read_file(relative_path)?;
        serde_json::from_str(&content)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
    }

    pub fn read_version(&self) -> std::io::Result<String> {
        fs::read_to_string(self.path().join(".schema/version"))
    }

    pub fn with_session(&self, session: SessionFixture) -> std::io::Result<&Self> {
        session.write_to(self.path(), self.version)?;
        Ok(self)
    }
}

#[derive(Debug, Clone)]
pub struct ParticipantFixture {
    pub id: String,
    pub human_id: String,
    pub source: String,
}

impl ParticipantFixture {
    #[allow(dead_code)]
    pub fn new(id: &str, human_id: &str) -> Self {
        Self {
            id: id.to_string(),
            human_id: human_id.to_string(),
            source: "manual".to_string(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct WordFixture {
    pub id: String,
    pub text: String,
    pub start_ms: u64,
    pub end_ms: u64,
    pub confidence: f64,
    pub speaker: u32,
}

impl WordFixture {
    pub fn new(id: &str, text: &str, start_ms: u64, end_ms: u64) -> Self {
        Self {
            id: id.to_string(),
            text: text.to_string(),
            start_ms,
            end_ms,
            confidence: 0.95,
            speaker: 0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct TranscriptFixture {
    pub id: String,
    pub session_id: String,
    pub started_at: u64,
    pub ended_at: Option<u64>,
    pub words: Vec<WordFixture>,
}

impl TranscriptFixture {
    pub fn new(id: &str, session_id: &str) -> Self {
        Self {
            id: id.to_string(),
            session_id: session_id.to_string(),
            started_at: 0,
            ended_at: None,
            words: Vec::new(),
        }
    }

    pub fn with_words(mut self, words: Vec<WordFixture>) -> Self {
        self.words = words;
        self
    }

    fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "transcripts": [{
                "id": self.id,
                "user_id": "local",
                "created_at": "2026-01-25T00:00:00Z",
                "session_id": self.session_id,
                "started_at": self.started_at,
                "ended_at": self.ended_at,
                "words": self.words.iter().map(|w| serde_json::json!({
                    "id": w.id,
                    "transcript_id": self.id,
                    "text": w.text,
                    "start_ms": w.start_ms,
                    "end_ms": w.end_ms,
                    "confidence": w.confidence,
                    "speaker": w.speaker
                })).collect::<Vec<_>>(),
                "speaker_hints": []
            }]
        })
    }
}

#[derive(Debug, Clone)]
pub struct SessionFixture {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub user_id: String,
    pub event_id: Option<String>,
    pub participants: Vec<ParticipantFixture>,
    pub transcript: Option<TranscriptFixture>,
}

impl SessionFixture {
    pub fn new(id: &str, title: &str) -> Self {
        Self {
            id: id.to_string(),
            title: title.to_string(),
            created_at: "2026-01-25T00:00:00Z".to_string(),
            user_id: "local".to_string(),
            event_id: None,
            participants: Vec::new(),
            transcript: None,
        }
    }

    pub fn with_transcript(mut self, transcript: TranscriptFixture) -> Self {
        self.transcript = Some(transcript);
        self
    }

    pub fn sample_meeting() -> Self {
        Self::new("e780bc6c-d209-47f0-8c13-8dd90d94ca5b", "Team Standup")
    }

    pub fn sample_with_transcript() -> Self {
        let session_id = "bb385a22-64ce-476c-882a-4d18b6706483";
        let transcript = TranscriptFixture::new("t-001", session_id).with_words(vec![
            WordFixture::new("w-001", "Hello", 0, 500),
            WordFixture::new("w-002", "world", 500, 1000),
        ]);

        Self::new(session_id, "Meeting with Transcript").with_transcript(transcript)
    }

    pub fn write_to(&self, base_dir: &Path, version: AppVersion) -> std::io::Result<()> {
        let session_dir = if version.sessions_in_root() {
            base_dir.join(&self.id)
        } else {
            base_dir.join("sessions").join(&self.id)
        };

        fs::create_dir_all(&session_dir)?;

        let meta = self.to_meta_json();
        fs::write(
            session_dir.join("_meta.json"),
            serde_json::to_string_pretty(&meta).unwrap(),
        )?;

        if let Some(ref transcript) = self.transcript {
            let transcript_filename = if version.uses_underscore_transcript() {
                "_transcript.json"
            } else {
                "transcript.json"
            };
            fs::write(
                session_dir.join(transcript_filename),
                serde_json::to_string_pretty(&transcript.to_json()).unwrap(),
            )?;
        }

        Ok(())
    }

    fn to_meta_json(&self) -> serde_json::Value {
        let mut meta = serde_json::json!({
            "id": self.id,
            "user_id": self.user_id,
            "created_at": self.created_at,
            "title": self.title,
            "participants": self.participants.iter().map(|p| serde_json::json!({
                "id": p.id,
                "user_id": "local",
                "created_at": self.created_at,
                "session_id": self.id,
                "human_id": p.human_id,
                "source": p.source
            })).collect::<Vec<_>>()
        });

        if let Some(ref event_id) = self.event_id {
            meta["event_id"] = serde_json::json!(event_id);
        }

        meta
    }
}

#[allow(dead_code)]
pub struct TestFixture {
    pub temp_dir: TempDir,
}

#[allow(dead_code)]
impl TestFixture {
    pub fn new() -> std::io::Result<Self> {
        let temp_dir = TempDir::new()?;
        Ok(Self { temp_dir })
    }

    pub fn path(&self) -> &Path {
        self.temp_dir.path()
    }

    pub fn set_version(&self, version: &str) -> std::io::Result<()> {
        let v = Version::parse(version).unwrap();
        version::write_version(self.path(), &v)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
    }

    pub fn read_version(&self) -> std::io::Result<String> {
        fs::read_to_string(self.path().join(".schema/version"))
    }

    pub fn file_exists(&self, relative_path: &str) -> bool {
        self.path().join(relative_path).exists()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versioned_fixture_v1_0_1() -> std::io::Result<()> {
        let fixture = VersionedFixture::new(AppVersion::V1_0_1)?;
        assert_eq!(fixture.read_version()?, "1.0.1");
        Ok(())
    }

    #[test]
    fn versioned_fixture_v1_0_2() -> std::io::Result<()> {
        let fixture = VersionedFixture::new(AppVersion::V1_0_2)?;
        assert_eq!(fixture.read_version()?, "1.0.2");
        Ok(())
    }

    #[test]
    fn fresh_fixture_has_no_version() -> std::io::Result<()> {
        let fixture = VersionedFixture::new_fresh()?;
        assert!(!fixture.file_exists(".schema/version"));
        Ok(())
    }

    #[test]
    fn sqlite_fixture_has_db_file() -> std::io::Result<()> {
        let fixture = VersionedFixture::new_with_sqlite()?;
        assert!(fixture.file_exists("db.sqlite"));
        assert!(!fixture.file_exists(".schema/version"));
        Ok(())
    }

    #[test]
    fn session_fixture_v1_0_1_uses_underscore_transcript() -> std::io::Result<()> {
        let fixture = VersionedFixture::new(AppVersion::V1_0_1)?;
        let session = SessionFixture::sample_with_transcript();
        fixture.with_session(session)?;

        assert!(fixture.file_exists("bb385a22-64ce-476c-882a-4d18b6706483/_transcript.json"));
        assert!(!fixture.file_exists("bb385a22-64ce-476c-882a-4d18b6706483/transcript.json"));
        Ok(())
    }

    #[test]
    fn session_fixture_v1_0_1_sessions_in_root() -> std::io::Result<()> {
        let fixture = VersionedFixture::new(AppVersion::V1_0_1)?;
        let session = SessionFixture::sample_meeting();
        fixture.with_session(session)?;

        assert!(fixture.file_exists("e780bc6c-d209-47f0-8c13-8dd90d94ca5b/_meta.json"));
        assert!(!fixture.file_exists("sessions/e780bc6c-d209-47f0-8c13-8dd90d94ca5b/_meta.json"));
        Ok(())
    }

    #[test]
    fn session_fixture_v1_0_2_uses_sessions_folder() -> std::io::Result<()> {
        let fixture = VersionedFixture::new(AppVersion::V1_0_2)?;
        let session = SessionFixture::sample_with_transcript();
        fixture.with_session(session)?;

        assert!(
            fixture.file_exists("sessions/bb385a22-64ce-476c-882a-4d18b6706483/transcript.json")
        );
        assert!(
            !fixture.file_exists("sessions/bb385a22-64ce-476c-882a-4d18b6706483/_transcript.json")
        );
        Ok(())
    }
}
