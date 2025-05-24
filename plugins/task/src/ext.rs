use std::future::Future;

use tauri::{Manager, Runtime};
use tauri_plugin_store2::{ScopedStore, StorePluginExt};

use crate::store::{StoreKey, TaskRecord};

pub trait TaskPluginExt<R: Runtime>: Manager<R> {
    fn task_store(&self) -> ScopedStore<R, StoreKey>;

    fn spawn_task<F, Fut>(&self, kind: &'static str, total_steps: u32, exec: F) -> String
    where
        F: Fn(StepCtx) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<(), crate::Error>> + Send + 'static;

    fn get_task(&self, id: String) -> Option<TaskRecord>;
    fn cancel_task(&self, id: String) -> Result<(), crate::Error>;
}

pub struct StepCtx {
    pub current: u32,
    pub total: u32,
}

impl StepCtx {
    pub fn current_step(&self) -> u32 {
        self.current
    }
    pub fn total_steps(&self) -> u32 {
        self.total
    }
}

impl<R: Runtime, T: Manager<R>> TaskPluginExt<R> for T {
    fn task_store(&self) -> ScopedStore<R, StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn spawn_task<F, Fut>(&self, _kind: &'static str, _total_steps: u32, _exec: F) -> String
    where
        F: Fn(StepCtx) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<(), crate::Error>> + Send + 'static,
    {
        "".to_string()
    }

    fn get_task(&self, _id: String) -> Option<TaskRecord> {
        None
    }

    fn cancel_task(&self, _id: String) -> Result<(), crate::Error> {
        Ok(())
    }
}
