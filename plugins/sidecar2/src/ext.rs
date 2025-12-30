use std::path::Path;

use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::Command;

pub struct Sidecar2<'a, R: tauri::Runtime, M: Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: Manager<R>> Sidecar2<'a, R, M> {
    pub fn sidecar(&self, name: impl AsRef<str>) -> Command {
        self.sidecar_with_passthrough(name, None::<&str>)
    }

    pub fn sidecar_with_passthrough(
        &self,
        name: impl AsRef<str>,
        passthrough_path: Option<impl AsRef<Path>>,
    ) -> Command {
        let home_dir = dirs::home_dir().unwrap();

        #[cfg(debug_assertions)]
        {
            if let Some(passthrough) = passthrough_path {
                return self
                    .manager
                    .shell()
                    .command(passthrough.as_ref())
                    .current_dir(home_dir);
            }
        }

        #[cfg(not(debug_assertions))]
        let _ = passthrough_path;

        self.manager
            .shell()
            .sidecar(name.as_ref())
            .expect("failed to create sidecar command")
            .current_dir(home_dir)
    }
}

pub trait Sidecar2PluginExt<R: tauri::Runtime> {
    fn sidecar2(&self) -> Sidecar2<'_, R, Self>
    where
        Self: Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: Manager<R>> Sidecar2PluginExt<R> for T {
    fn sidecar2(&self) -> Sidecar2<'_, R, Self>
    where
        Self: Sized,
    {
        Sidecar2 {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
