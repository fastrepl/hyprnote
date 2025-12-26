use crate::common_derives;

common_derives! {
    pub struct Transcript {
        pub segments: Vec<Segment>,
    }
}

common_derives! {
    pub struct Segment {
        pub text: String,
        pub speaker: String,
    }
}

common_derives! {
    pub struct Session {
        pub is_event: bool,
        pub title: Option<String>,
        pub started_at: Option<String>,
        pub ended_at: Option<String>,
        pub location: Option<String>,
    }
}

common_derives! {
    pub struct Participant {
        pub name: String,
        pub job_title: Option<String>,
    }
}

common_derives! {
    pub struct TemplateSection {
        pub title: String,
        pub description: Option<String>,
    }
}

common_derives! {
    pub struct EnhanceTemplate {
        pub title: String,
        pub description: Option<String>,
        pub sections: Vec<TemplateSection>,
    }
}
