use std::path::PathBuf;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri_specta::Event;

use crate::SettingsChanged;

pub struct Notify<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Notify<'a, R, M> {
    pub fn ping(&self) -> Result<(), crate::Error> {
        Ok(())
    }

    pub fn watch_settings(&self, path: PathBuf) -> Result<RecommendedWatcher, crate::Error> {
        let app_handle = self.manager.app_handle().clone();
        let path_str = path.to_string_lossy().to_string();

        let mut watcher =
            notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
                if let Ok(event) = res {
                    if event.kind.is_modify() || event.kind.is_create() {
                        let _ = SettingsChanged {
                            path: path_str.clone(),
                        }
                        .emit(&app_handle);
                    }
                }
            })?;

        watcher.watch(&path, RecursiveMode::NonRecursive)?;
        Ok(watcher)
    }
}

pub trait NotifyPluginExt<R: tauri::Runtime> {
    fn notify(&self) -> Notify<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> NotifyPluginExt<R> for T {
    fn notify(&self) -> Notify<'_, R, Self>
    where
        Self: Sized,
    {
        Notify {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
