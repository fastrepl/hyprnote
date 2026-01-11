use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_full::{DebouncedEvent, new_debouncer};
use tauri_plugin_path2::Path2PluginExt;
use tauri_specta::Event;

use crate::{FileChanged, WatcherState};

const DEBOUNCE_DELAY_MS: u64 = 900;

pub struct Notify<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Notify<'a, R, M> {
    pub fn start(&self) -> Result<(), crate::Error> {
        let state = self.manager.state::<WatcherState>();
        let mut guard = state.debouncer.lock().unwrap();

        if guard.is_some() {
            return Ok(());
        }

        let base = self.manager.app_handle().path2().base()?;
        let app_handle = self.manager.app_handle().clone();
        let base_for_closure = base.clone();

        let mut debouncer = new_debouncer(
            Duration::from_millis(DEBOUNCE_DELAY_MS),
            None,
            move |events: Result<Vec<DebouncedEvent>, Vec<notify::Error>>| {
                if let Ok(events) = events {
                    let mut changed_paths: std::collections::HashSet<String> =
                        std::collections::HashSet::new();

                    for event in events {
                        let should_emit = match &event.kind {
                            notify::EventKind::Create(_) => true,
                            notify::EventKind::Remove(_) => true,

                            notify::EventKind::Any => false,
                            notify::EventKind::Access(_) | notify::EventKind::Other => false,
                            notify::EventKind::Modify(modify_kind) => {
                                matches!(
                                    modify_kind,
                                    notify::event::ModifyKind::Any
                                        | notify::event::ModifyKind::Data(_)
                                        | notify::event::ModifyKind::Name(_)
                                )
                            }
                        };

                        if !should_emit {
                            continue;
                        }

                        for path in &event.paths {
                            let relative_path = path
                                .strip_prefix(&base_for_closure)
                                .unwrap_or(path)
                                .to_string_lossy()
                                .to_string();

                            changed_paths.insert(relative_path);
                        }
                    }

                    for path in changed_paths {
                        tracing::info!("file_changed: {:?}", path);
                        let _ = FileChanged { path }.emit(&app_handle);
                    }
                }
            },
        )?;

        debouncer.watch(&base, RecursiveMode::Recursive)?;
        *guard = Some(debouncer);

        Ok(())
    }

    pub fn stop(&self) -> Result<(), crate::Error> {
        let state = self.manager.state::<WatcherState>();
        let mut guard = state.debouncer.lock().unwrap();
        *guard = None;
        Ok(())
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
