use std::ffi::OsString;

#[derive(Debug, Clone)]
pub enum HookEvent {
    AfterListeningStopped(AfterListeningStoppedArgs),
    BeforeListeningStarted(BeforeListeningStartedArgs),
}

impl HookEvent {
    pub fn condition_key(&self) -> &'static str {
        match self {
            HookEvent::AfterListeningStopped(_) => "afterListeningStopped",
            HookEvent::BeforeListeningStarted(_) => "beforeListeningStarted",
        }
    }

    pub fn cli_args(&self) -> Vec<OsString> {
        match self {
            HookEvent::AfterListeningStopped(args) => args.to_cli_args(),
            HookEvent::BeforeListeningStarted(args) => args.to_cli_args(),
        }
    }
}

pub trait HookArgs {
    fn to_cli_args(&self) -> Vec<OsString>;
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
/// 123
pub struct AfterListeningStoppedArgs {
    /// 345
    pub session_id: String,
}

impl HookArgs for AfterListeningStoppedArgs {
    fn to_cli_args(&self) -> Vec<OsString> {
        vec![
            OsString::from("--session-id"),
            OsString::from(&self.session_id),
        ]
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
/// 123
pub struct BeforeListeningStartedArgs {
    /// 345
    pub session_id: String,
}

impl HookArgs for BeforeListeningStartedArgs {
    fn to_cli_args(&self) -> Vec<OsString> {
        vec![
            OsString::from("--session-id"),
            OsString::from(&self.session_id),
        ]
    }
}
