pub struct Flag<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Flag<'a, R, M> {
    pub fn is_enabled(&self, feature: &str) -> bool {
        let version = self
            .manager
            .config()
            .version
            .clone()
            .unwrap_or_else(|| "0.0.0".to_string());

        is_feature_enabled(feature, &version)
    }
}

fn is_feature_enabled(feature: &str, _version: &str) -> bool {
    match feature {
        _ => false,
    }
}

pub trait FlagPluginExt<R: tauri::Runtime> {
    fn flag(&self) -> Flag<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> FlagPluginExt<R> for T {
    fn flag(&self) -> Flag<'_, R, Self>
    where
        Self: Sized,
    {
        Flag {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
