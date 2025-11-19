use std::ffi::OsString;

pub trait HookArgs {
    fn to_cli_args(&self) -> Vec<OsString>;
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct AfterListeningStoppedArgs {
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

#[derive(Debug, Clone)]
pub enum HookEvent {
    AfterListeningStopped(AfterListeningStoppedArgs),
}

impl HookEvent {
    pub fn condition_key(&self) -> &'static str {
        match self {
            HookEvent::AfterListeningStopped(_) => "afterListeningStopped",
        }
    }

    pub fn cli_args(&self) -> Vec<OsString> {
        match self {
            HookEvent::AfterListeningStopped(args) => args.to_cli_args(),
        }
    }
}
