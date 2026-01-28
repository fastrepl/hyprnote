macro_rules! common_derives {
    ($item:item) => {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        $item
    };
}

#[derive(Debug, Default)]
pub struct Collection {
    pub sessions: Vec<Session>,
    pub transcripts: Vec<Transcript>,
    pub humans: Vec<Human>,
    pub organizations: Vec<Organization>,
    pub participants: Vec<SessionParticipant>,
    pub templates: Vec<Template>,
    pub enhanced_notes: Vec<EnhancedNote>,
    pub tags: Vec<Tag>,
    pub tag_mappings: Vec<TagMapping>,
}

common_derives! {
    pub struct Session {
        pub id: String,
        #[serde(default)]
        pub user_id: String,
        #[serde(default)]
        pub created_at: String,
        #[serde(default)]
        pub title: String,
        #[serde(default)]
        pub raw_md: Option<String>,
        #[serde(default)]
        pub enhanced_content: Option<String>,
        #[serde(default)]
        pub folder_id: Option<String>,
        #[serde(default)]
        pub event_id: Option<String>,
    }
}

common_derives! {
    pub struct Transcript {
        pub id: String,
        #[serde(default)]
        pub user_id: String,
        #[serde(default)]
        pub created_at: String,
        #[serde(default)]
        pub session_id: String,
        #[serde(default)]
        pub title: String,
        #[serde(default)]
        pub started_at: f64,
        #[serde(default)]
        pub ended_at: Option<f64>,
        #[serde(default)]
        pub start_ms: Option<f64>,
        #[serde(default)]
        pub end_ms: Option<f64>,
        #[serde(default)]
        pub words: Vec<Word>,
    }
}

common_derives! {
    pub struct Word {
        pub id: String,
        #[serde(default)]
        pub text: String,
        #[serde(default)]
        pub start_ms: Option<f64>,
        #[serde(default)]
        pub end_ms: Option<f64>,
        #[serde(default)]
        pub channel: i64,
        #[serde(default)]
        pub speaker: Option<String>,
    }
}

common_derives! {
    pub struct Human {
        pub id: String,
        #[serde(default)]
        pub user_id: String,
        #[serde(default)]
        pub created_at: String,
        #[serde(default)]
        pub name: String,
        #[serde(default)]
        pub email: Option<String>,
        #[serde(default)]
        pub org_id: Option<String>,
        #[serde(default)]
        pub job_title: Option<String>,
        #[serde(default)]
        pub linkedin_username: Option<String>,
    }
}

common_derives! {
    pub struct Organization {
        pub id: String,
        #[serde(default)]
        pub user_id: String,
        #[serde(default)]
        pub created_at: String,
        #[serde(default)]
        pub name: String,
        #[serde(default)]
        pub description: Option<String>,
    }
}

common_derives! {
    pub struct SessionParticipant {
        pub id: String,
        #[serde(default)]
        pub user_id: String,
        #[serde(default)]
        pub session_id: String,
        #[serde(default)]
        pub human_id: String,
        #[serde(default)]
        pub source: String,
    }
}

common_derives! {
    pub struct Template {
        pub id: String,
        #[serde(default)]
        pub user_id: String,
        #[serde(default)]
        pub title: String,
        #[serde(default)]
        pub description: String,
        #[serde(default)]
        pub sections: Vec<TemplateSection>,
        #[serde(default)]
        pub tags: Vec<String>,
        #[serde(default)]
        pub context_option: Option<String>,
    }
}

common_derives! {
    pub struct TemplateSection {
        #[serde(default)]
        pub title: String,
        #[serde(default)]
        pub description: String,
    }
}

common_derives! {
    pub struct EnhancedNote {
        pub id: String,
        #[serde(default)]
        pub user_id: String,
        #[serde(default)]
        pub session_id: String,
        #[serde(default)]
        pub content: String,
        #[serde(default)]
        pub template_id: Option<String>,
        #[serde(default)]
        pub position: i32,
        #[serde(default)]
        pub title: String,
    }
}

common_derives! {
    pub struct Tag {
        pub id: String,
        #[serde(default)]
        pub user_id: String,
        #[serde(default)]
        pub name: String,
    }
}

common_derives! {
    pub struct TagMapping {
        pub id: String,
        #[serde(default)]
        pub user_id: String,
        #[serde(default)]
        pub tag_id: String,
        #[serde(default)]
        pub session_id: String,
    }
}
