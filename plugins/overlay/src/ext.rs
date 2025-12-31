use tauri::WebviewWindow;

pub struct Overlay<'a, M: tauri::Manager<tauri::Wry>> {
    manager: &'a M,
}

impl<'a, M: tauri::Manager<tauri::Wry>> Overlay<'a, M> {
    pub fn spawn_listener(&self, window: WebviewWindow) {
        let app = self.manager.app_handle().clone();
        crate::spawn_overlay_listener(app, window);
    }

    pub fn abort_listener(&self) {
        crate::abort_overlay_join_handle();
    }
}

pub trait OverlayPluginExt {
    fn overlay(&self) -> Overlay<'_, Self>
    where
        Self: tauri::Manager<tauri::Wry> + Sized;
}

impl<T: tauri::Manager<tauri::Wry>> OverlayPluginExt for T {
    fn overlay(&self) -> Overlay<'_, Self>
    where
        Self: Sized,
    {
        Overlay { manager: self }
    }
}
