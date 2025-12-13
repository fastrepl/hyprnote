mod app_cli;
mod app_info;
mod app_new;
mod tray_check_update;
mod tray_open;
mod tray_quit;
mod tray_start;

pub use app_cli::{AppCliInstall, AppCliUninstall, app_cli_menu};
pub use app_info::AppInfo;
pub use app_new::AppNew;
pub use tray_check_update::TrayCheckUpdate;
pub use tray_open::TrayOpen;
pub use tray_quit::TrayQuit;
pub use tray_start::TrayStart;

use tauri::{AppHandle, Result, menu::MenuItemKind};

pub trait MenuItemHandler {
    const ID: &'static str;

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>>;
    fn handle(app: &AppHandle<tauri::Wry>);
}

macro_rules! menu_items {
    ($($variant:ident => $item:ty),* $(,)?) => {
        #[derive(Debug, Clone, Copy)]
        pub enum HyprMenuItem {
            $($variant),*
        }

        impl From<HyprMenuItem> for tauri::menu::MenuId {
            fn from(value: HyprMenuItem) -> Self {
                match value {
                    $(HyprMenuItem::$variant => <$item as MenuItemHandler>::ID),*
                }.into()
            }
        }

        impl From<tauri::menu::MenuId> for HyprMenuItem {
            fn from(id: tauri::menu::MenuId) -> Self {
                let id = id.0.as_str();
                match id {
                    $(<$item as MenuItemHandler>::ID => HyprMenuItem::$variant,)*
                    _ => unreachable!("Unknown menu id: {}", id),
                }
            }
        }

        impl HyprMenuItem {
            pub fn handle(self, app: &AppHandle<tauri::Wry>) {
                match self {
                    $(HyprMenuItem::$variant => <$item>::handle(app)),*
                }
            }
        }
    };
}

menu_items! {
    TrayOpen => TrayOpen,
    TrayStart => TrayStart,
    TrayCheckUpdate => TrayCheckUpdate,
    TrayQuit => TrayQuit,
    AppInfo => AppInfo,
    AppCliInstall => AppCliInstall,
    AppCliUninstall => AppCliUninstall,
    AppNew => AppNew,
}
