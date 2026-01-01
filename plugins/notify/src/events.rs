#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(
            Debug, serde::Serialize, serde::Deserialize, Clone, specta::Type, tauri_specta::Event,
        )]
        $item
    };
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    Session,
    Transcript,
    Human,
    Organization,
    Event,
    ChatGroup,
    ChatMessage,
    EnhancedNote,
    Template,
    Memory,
    Folder,
    Tag,
    Prompt,
    ChatShortcut,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ChangeAction {
    Created,
    Updated,
    Deleted,
}

common_event_derives! {
    pub struct EntityChanged {
        pub entity_type: EntityType,
        pub entity_id: String,
        pub action: ChangeAction,
    }
}

common_event_derives! {
    pub struct SettingsChanged {
        pub path: String,
    }
}

common_event_derives! {
    pub struct FileChanged {
        pub path: String,
    }
}
