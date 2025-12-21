use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum IconVariant {
    Beta,
    Dark,
    Light,
    Pro,
}

impl IconVariant {
    pub fn name(&self) -> &'static str {
        match self {
            IconVariant::Beta => "beta",
            IconVariant::Dark => "dark",
            IconVariant::Light => "light",
            IconVariant::Pro => "pro",
        }
    }

    pub fn xmas_name(&self) -> &'static str {
        match self {
            IconVariant::Beta => "xmas-beta",
            IconVariant::Dark => "xmas-dark",
            IconVariant::Light => "xmas-light",
            IconVariant::Pro => "xmas-pro",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            IconVariant::Beta => "Beta",
            IconVariant::Dark => "Dark",
            IconVariant::Light => "Light",
            IconVariant::Pro => "Pro",
        }
    }
}

pub struct Icon<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Icon<'a, R, M> {
    pub fn get_available_icons(&self, is_pro: bool) -> Result<Vec<IconVariant>, crate::Error> {
        let identifier = self.manager.app_handle().config().identifier.as_str();
        let is_nightly = identifier.contains("nightly");

        let mut icons = vec![IconVariant::Light, IconVariant::Dark];

        if is_nightly {
            icons.insert(0, IconVariant::Beta);
        }

        if is_pro {
            icons.push(IconVariant::Pro);
        }

        Ok(icons)
    }

    pub fn set_dock_icon(&self, name: String) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            use std::path::PathBuf;
            use tauri::path::BaseDirectory;

            let icon_path = if cfg!(debug_assertions) {
                PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .parent()
                    .unwrap()
                    .parent()
                    .unwrap()
                    .join("apps")
                    .join("desktop")
                    .join("src-tauri")
                    .join("icons")
                    .join(&name)
                    .join("icon.icns")
            } else {
                self.manager
                    .path()
                    .resolve(format!("icons/{}.icns", name), BaseDirectory::Resource)
                    .map_err(crate::Error::Tauri)?
            };

            if !icon_path.exists() {
                return Err(crate::Error::Custom(format!(
                    "Icon file not found: {}",
                    icon_path.display()
                )));
            }

            let icon_path_str = icon_path.to_string_lossy().to_string();

            let app_handle = self.manager.app_handle();
            app_handle
                .run_on_main_thread(move || {
                    use objc2::AnyThread;
                    use objc2_app_kit::{NSApplication, NSImage};
                    use objc2_foundation::{MainThreadMarker, NSString};

                    let mtm =
                        MainThreadMarker::new().expect("run_on_main_thread guarantees main thread");
                    let ns_app = NSApplication::sharedApplication(mtm);

                    let path_str = NSString::from_str(&icon_path_str);
                    let image = NSImage::initWithContentsOfFile(NSImage::alloc(), &path_str);

                    if let Some(image) = image {
                        unsafe { ns_app.setApplicationIconImage(Some(&image)) };
                    }
                })
                .map_err(crate::Error::Tauri)?;

            Ok(())
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _ = name;
            Ok(())
        }
    }

    pub fn reset_dock_icon(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            let app_handle = self.manager.app_handle();
            app_handle
                .run_on_main_thread(move || {
                    use objc2_app_kit::NSApplication;
                    use objc2_foundation::MainThreadMarker;

                    let mtm =
                        MainThreadMarker::new().expect("run_on_main_thread guarantees main thread");
                    let ns_app = NSApplication::sharedApplication(mtm);

                    unsafe { ns_app.setApplicationIconImage(None) };
                })
                .map_err(crate::Error::Tauri)?;

            Ok(())
        }

        #[cfg(not(target_os = "macos"))]
        {
            Ok(())
        }
    }
}

pub trait IconPluginExt<R: tauri::Runtime> {
    fn icon(&self) -> Icon<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> IconPluginExt<R> for T {
    fn icon(&self) -> Icon<'_, R, Self>
    where
        Self: Sized,
    {
        Icon {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
