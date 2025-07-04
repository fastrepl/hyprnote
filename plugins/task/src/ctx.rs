use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::Runtime;
use tauri_plugin_store2::ScopedStore;

use crate::{StoreKey, TaskRecord, TaskStatus};

pub struct TaskCtx<R: Runtime> {
    id: String,
    current: u32,
    total: u32,
    store: ScopedStore<R, StoreKey>,
    cancelled: Arc<AtomicBool>,
}

impl<R: Runtime> TaskCtx<R> {
    pub fn new(id: String, total: u32, store: ScopedStore<R, StoreKey>) -> Self {
        Self {
            id,
            current: 0,
            total,
            store,
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    pub(crate) fn cancelled_flag(&self) -> Arc<AtomicBool> {
        self.cancelled.clone()
    }
}

impl<R: Runtime> TaskCtx<R> {
    pub fn id(&self) -> &str {
        &self.id
    }

    pub fn current_step(&self) -> u32 {
        self.current
    }

    pub fn total_steps(&self) -> u32 {
        self.total
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Relaxed)
    }

    pub fn advance(&mut self, _data: impl serde::Serialize) -> Result<(), crate::Error> {
        if self.is_cancelled() {
            return Ok(());
        }

        self.current = self.current.saturating_add(1);
        self.update_status(TaskStatus::Running {
            current: self.current,
            total: self.total,
        })
    }

    pub fn complete(&self) -> Result<(), crate::Error> {
        self.update_status(TaskStatus::Completed)
    }

    pub fn fail(&self, error: String) -> Result<(), crate::Error> {
        self.update_status(TaskStatus::Failed { error })
    }

    fn update_status(&self, status: TaskStatus) -> Result<(), crate::Error> {
        let id = self.id.clone();

        let record = TaskRecord {
            id: id.clone(),
            status,
            data: std::collections::HashMap::new(),
        };

        self.store
            .set(StoreKey::Tasks(id), record)
            .map_err(|_| crate::Error::StoreError)?;

        Ok(())
    }
}
