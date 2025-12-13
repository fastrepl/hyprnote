pub trait IconPluginExt<R: tauri::Runtime> {
    fn set_dock_icon(&self, name: String) -> Result<(), crate::Error>;
    fn reset_dock_icon(&self) -> Result<(), crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> IconPluginExt<R> for T {
    fn set_dock_icon(&self, name: String) -> Result<(), crate::Error> {
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
                self.path()
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

            let app_handle = self.app_handle();
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

    fn reset_dock_icon(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            let app_handle = self.app_handle();
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
