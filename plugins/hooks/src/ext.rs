use crate::{event::HookEvent, runner::run_hooks_for_event};

pub trait HooksPluginExt<R: tauri::Runtime> {
    fn run_hooks(&self, event: HookEvent) -> crate::Result<()>;
}

impl<R, T> HooksPluginExt<R> for T
where
    R: tauri::Runtime,
    T: tauri::Manager<R>,
{
    fn run_hooks(&self, event: HookEvent) -> crate::Result<()> {
        run_hooks_for_event(self, event)
    }
}
