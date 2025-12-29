use std::sync::Once;

use tauri_nspanel::ManagerExt;

use crate::panel::{
    setup_menubar_panel_listeners, swizzle_to_menubar_panel, update_menubar_appearance,
};

static INIT: Once = Once::new();

#[tauri::command]
pub fn init(app_handle: tauri::AppHandle) {
    INIT.call_once(|| {
        swizzle_to_menubar_panel(&app_handle);

        update_menubar_appearance(&app_handle);

        setup_menubar_panel_listeners(&app_handle);
    });
}

#[tauri::command]
pub fn show_panel(app_handle: tauri::AppHandle) {
    if let Ok(panel) = app_handle.get_webview_panel("main") {
        panel.show();
    }
}
