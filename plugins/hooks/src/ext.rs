use crate::{
    event::HookEvent,
    runner::{run_hooks_for_event, HookResult},
};

pub trait HooksPluginExt<R: tauri::Runtime> {
    fn run_hooks(
        &self,
        event: HookEvent,
    ) -> impl std::future::Future<Output = crate::Result<Vec<HookResult>>> + Send;
}

impl<R, T> HooksPluginExt<R> for T
where
    R: tauri::Runtime,
    T: tauri::Manager<R> + Send + Sync,
{
    async fn run_hooks(&self, event: HookEvent) -> crate::Result<Vec<HookResult>> {
        run_hooks_for_event(self, event).await
    }
}
