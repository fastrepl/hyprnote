use std::sync::Mutex;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri_plugin_path2::Path2PluginExt;
use tauri_specta::Event;

use crate::{FileChanged, SettingsChanged};

pub struct WatcherState {
    _watcher: Mutex<Option<RecommendedWatcher>>,
}

pub struct Notify<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Notify<'a, R, M> {
    pub fn setup_watcher(&self) -> Result<WatcherState, crate::Error> {
        let base = self.manager.app_handle().path2().base()?;
        let app_handle = self.manager.app_handle().clone();

        let mut watcher =
            notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
                let event = match res {
                    Ok(e) => e,
                    Err(e) => {
                        tracing::warn!("File watcher error: {}", e);
                        return;
                    }
                };

                if !event.kind.is_modify() && !event.kind.is_create() {
                    return;
                }

                for path in event.paths {
                    let path_str = path.to_string_lossy().to_string();

                    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

                    if file_name == "settings.json" {
                        let _ = SettingsChanged {
                            path: path_str.clone(),
                        }
                        .emit(&app_handle);
                    }

                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                    if ext == "json" || ext == "md" {
                        let _ = FileChanged { path: path_str }.emit(&app_handle);
                    }
                }
            })?;

        watcher.watch(&base, RecursiveMode::Recursive)?;

        tracing::info!("File watcher started for: {:?}", base);

        Ok(WatcherState {
            _watcher: Mutex::new(Some(watcher)),
        })
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
