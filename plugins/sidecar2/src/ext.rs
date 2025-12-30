use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::Command;

pub struct Sidecar2<'a, R: tauri::Runtime, M: Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: Manager<R>> Sidecar2<'a, R, M> {
    pub fn sidecar(&self, name: impl AsRef<str>) -> Command {
        let name = name.as_ref();
        let home_dir = dirs::home_dir().unwrap();

        #[cfg(debug_assertions)]
        {
            if let Some(binary_name) = name.strip_prefix("hyprnote-sidecar-") {
                if let Some((passthrough, binary)) = resolve_debug_paths(binary_name) {
                    return self
                        .manager
                        .shell()
                        .command(&passthrough)
                        .current_dir(home_dir)
                        .arg(&binary);
                }
            }
        }

        self.manager
            .shell()
            .sidecar(name)
            .expect("failed to create sidecar command")
            .current_dir(home_dir)
    }
}

#[cfg(debug_assertions)]
fn resolve_debug_paths(binary_name: &str) -> Option<(std::path::PathBuf, std::path::PathBuf)> {
    let passthrough = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../apps/desktop/src-tauri/resources/passthrough-aarch64-apple-darwin");
    let binary = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(format!(
        "../../apps/desktop/src-tauri/resources/{}-aarch64-apple-darwin",
        binary_name
    ));

    if passthrough.exists() && binary.exists() {
        Some((passthrough, binary))
    } else {
        None
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
