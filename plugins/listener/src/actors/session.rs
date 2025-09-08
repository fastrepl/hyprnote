use ractor::{Actor, ActorCell, ActorRef, SpawnErr};
use std::time::Duration;
use tokio_util::sync::CancellationToken;

use crate::actors::{
    AudioProcessor, ListenArgs, ListenBridge, ProcArgs, RecArgs, Recorder, SourceActor, SrcArgs,
    SrcWhich,
};

enum SessionMsg {}

struct SessionState {}

struct SessionSupervisor {
    app: tauri::AppHandle,
}

impl SessionSupervisor {
    fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }
}
