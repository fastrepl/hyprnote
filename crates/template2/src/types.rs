use crate::common_derives;

common_derives! {
    pub struct Transcript {
        pub segments: Vec<Segment>,
        pub started_at: Option<u64>,
        pub ended_at: Option<u64>,
    }
}

common_derives! {
    pub struct Segment {
        pub text: String,
        pub speaker: String,
    }
}

common_derives! {
    pub struct Event {
        pub name: String,
    }
}

common_derives! {
    pub struct Session {
        pub title: Option<String>,
        pub started_at: Option<String>,
        pub ended_at: Option<String>,
        pub event: Option<Event>,
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
