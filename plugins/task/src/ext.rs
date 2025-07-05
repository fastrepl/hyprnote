use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_store2::{ScopedStore, StorePluginExt};

use crate::{StoreKey, TaskCtx, TaskRecord, TaskState, TaskStatus};

pub trait TaskPluginExt<R: Runtime>: Manager<R> {
    fn task_store(&self) -> ScopedStore<R, StoreKey>;

    fn spawn_task_blocking<F, Fut>(&self, exec: F) -> String
    where
        F: FnOnce(TaskCtx<R>) -> Fut + Send + 'static,
        Fut: Send + 'static;

    fn get_task(&self, id: String) -> Option<TaskRecord>;
    fn cancel_task(&self, id: String) -> Result<(), crate::Error>;
}

impl<R: Runtime, T: Manager<R>> TaskPluginExt<R> for T {
    fn task_store(&self) -> ScopedStore<R, StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn spawn_task_blocking<F, Fut>(&self, exec: F) -> String
    where
        F: FnOnce(TaskCtx<R>) -> Fut + Send + 'static,
        Fut: Send + 'static,
    {
        let id = uuid::Uuid::new_v4().to_string();
        let ctx = TaskCtx::new(id.clone(), self.task_store());

        let task_state: tauri::State<TaskState> = self.state();
        let app_handle: AppHandle<R> = self.app_handle().clone();

        let cancel_flag = ctx.cancelled_flag();
        task_state.register_task(id.clone(), cancel_flag);

        let initial_record = TaskRecord {
            id: id.clone(),
            status: TaskStatus::Running {
                current: 0,
                total: 1,
            },
            data: std::collections::HashMap::new(),
        };

        let _ = self
            .task_store()
            .set(StoreKey::Tasks(id.clone()), initial_record);

        let task_id = id.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let _ = exec(ctx);

            if let Some(state) = app_handle.try_state::<TaskState>() {
                state.remove_task(&task_id);
            }
        });

        id
    }

    fn get_task(&self, id: String) -> Option<TaskRecord> {
        self.task_store().get(StoreKey::Tasks(id)).ok().flatten()
    }

    fn cancel_task(&self, id: String) -> Result<(), crate::Error> {
        let task_state: tauri::State<TaskState> = self.state();

        if task_state.cancel_task(&id) {
            if let Some(mut record) = self.get_task(id.clone()) {
                record.status = TaskStatus::Cancelled;
                self.task_store()
                    .set(StoreKey::Tasks(id), record)
                    .map_err(|_| crate::Error::StoreError)?;
            }
            Ok(())
        } else {
            Ok(())
        }
    }
}
