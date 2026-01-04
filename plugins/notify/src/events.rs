#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(
            Debug, serde::Serialize, serde::Deserialize, Clone, specta::Type, tauri_specta::Event,
        )]
        $item
    };
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ChangeKind {
    Created,
    Modified,
    Removed,
    Renamed,
    Access,
    Any,
    Other,
}

impl ChangeKind {
    pub fn from_event_kind(kind: &notify::EventKind) -> Self {
        use notify::EventKind as NK;

        match kind {
            NK::Create(_) => ChangeKind::Created,
            NK::Modify(modify_kind) => {
                use notify::event::ModifyKind;
                match modify_kind {
                    ModifyKind::Name(_) => ChangeKind::Renamed,
                    _ => ChangeKind::Modified,
                }
            }
            NK::Remove(_) => ChangeKind::Removed,
            NK::Access(_) => ChangeKind::Access,
            NK::Any => ChangeKind::Any,
            NK::Other => ChangeKind::Other,
        }
    }
}

common_event_derives! {
    pub struct FileChanged {
        pub path: String,
        pub kind: ChangeKind,
    }
}
