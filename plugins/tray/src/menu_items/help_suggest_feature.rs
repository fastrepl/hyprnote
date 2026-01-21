use tauri::{
    AppHandle, Result,
    menu::{MenuItem, MenuItemKind},
};

use super::MenuItemHandler;

pub struct HelpSuggestFeature;

impl MenuItemHandler for HelpSuggestFeature {
    const ID: &'static str = "hypr_help_suggest_feature";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = MenuItem::with_id(app, Self::ID, "Suggest Feature", true, None::<&str>)?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        use tauri_plugin_windows::{AppWindow, OpenFeedback, WindowsPluginExt};
        use tauri_specta::Event;

        if app.windows().show(AppWindow::Main).is_ok() {
            let event = OpenFeedback {
                feedback_type: "feature".to_string(),
            };
            let _ = event.emit(app);
        }
    }
}
