#[cfg(target_os = "macos")]
mod recording_indicator_state {
    use std::sync::Mutex;

    static ORIGINAL_ICON_DATA: Mutex<Option<Vec<u8>>> = Mutex::new(None);

    pub fn get() -> Option<Vec<u8>> {
        ORIGINAL_ICON_DATA.lock().unwrap().clone()
    }

    pub fn set(data: Option<Vec<u8>>) {
        *ORIGINAL_ICON_DATA.lock().unwrap() = data;
    }

    pub fn clear() {
        *ORIGINAL_ICON_DATA.lock().unwrap() = None;
    }
}

pub struct Icon<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Icon<'a, R, M> {
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

                    recording_indicator_state::clear();

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

                    recording_indicator_state::clear();

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

    pub fn set_recording_indicator(&self, show: bool) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            let app_handle = self.manager.app_handle();
            app_handle
                .run_on_main_thread(move || {
                    use objc2::AnyThread;
                    use objc2_app_kit::{NSApplication, NSBezierPath, NSColor, NSImage};
                    use objc2_foundation::{MainThreadMarker, NSData, NSPoint, NSRect, NSSize};

                    let mtm =
                        MainThreadMarker::new().expect("run_on_main_thread guarantees main thread");
                    let ns_app = NSApplication::sharedApplication(mtm);

                    if !show {
                        if let Some(original_data) = recording_indicator_state::get() {
                            let ns_data = NSData::with_bytes(&original_data);
                            let original_image =
                                unsafe { NSImage::initWithData(NSImage::alloc(), &ns_data) };
                            if let Some(original_image) = original_image {
                                unsafe { ns_app.setApplicationIconImage(Some(&original_image)) };
                            }
                            recording_indicator_state::clear();
                        }
                        return;
                    }

                    let base_image = if let Some(original_data) = recording_indicator_state::get() {
                        let ns_data = NSData::with_bytes(&original_data);
                        let original_image =
                            unsafe { NSImage::initWithData(NSImage::alloc(), &ns_data) };
                        match original_image {
                            Some(img) => img,
                            None => return,
                        }
                    } else {
                        let Some(current) = (unsafe { ns_app.applicationIconImage() }) else {
                            return;
                        };

                        let Some(tiff_data) = (unsafe { current.TIFFRepresentation() }) else {
                            return;
                        };
                        let len = unsafe { tiff_data.length() };
                        if len == 0 {
                            return;
                        }
                        let bytes = unsafe {
                            std::slice::from_raw_parts(tiff_data.bytes().cast::<u8>(), len)
                        }
                        .to_vec();
                        recording_indicator_state::set(Some(bytes));

                        current
                    };

                    let size = unsafe { base_image.size() };
                    let composite_image = unsafe { NSImage::initWithSize(NSImage::alloc(), size) };

                    unsafe {
                        composite_image.lockFocus();

                        base_image.drawAtPoint_fromRect_operation_fraction(
                            NSPoint::new(0.0, 0.0),
                            NSRect::new(NSPoint::new(0.0, 0.0), size),
                            objc2_app_kit::NSCompositingOperation::Copy,
                            1.0,
                        );

                        let dot_size = size.width * 0.25;
                        let dot_x = size.width - dot_size - (size.width * 0.05);
                        let dot_y = size.height - dot_size - (size.height * 0.05);

                        let red_color = NSColor::systemRedColor();
                        red_color.setFill();

                        let dot_rect = NSRect::new(
                            NSPoint::new(dot_x, dot_y),
                            NSSize::new(dot_size, dot_size),
                        );
                        let dot_path = NSBezierPath::bezierPathWithOvalInRect(dot_rect);
                        dot_path.fill();

                        composite_image.unlockFocus();

                        ns_app.setApplicationIconImage(Some(&composite_image));
                    }
                })
                .map_err(crate::Error::Tauri)?;

            Ok(())
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _ = show;
            Ok(())
        }
    }

    pub fn get_icon(&self) -> Result<Option<String>, crate::Error> {
        #[cfg(target_os = "macos")]
        {
            use base64::Engine;
            use objc2::AnyThread;
            use objc2::msg_send;
            use objc2_app_kit::{NSApplication, NSBitmapImageFileType, NSBitmapImageRep};
            use objc2_foundation::{MainThreadMarker, NSRect, NSSize};
            use std::sync::mpsc;

            let (tx, rx) = mpsc::channel();
            let app_handle = self.manager.app_handle();

            app_handle
                .run_on_main_thread(move || {
                    let mtm =
                        MainThreadMarker::new().expect("run_on_main_thread guarantees main thread");
                    let ns_app = NSApplication::sharedApplication(mtm);

                    unsafe {
                        let Some(image) = ns_app.applicationIconImage() else {
                            let _ = tx.send(None);
                            return;
                        };

                        let size = NSSize::new(64.0, 64.0);
                        image.setSize(size);

                        let mut rect = NSRect::new(objc2_foundation::NSPoint::new(0.0, 0.0), size);
                        let Some(cgimage) = image.CGImageForProposedRect_context_hints(
                            &mut rect as *mut NSRect as *mut _,
                            None,
                            None,
                        ) else {
                            let _ = tx.send(None);
                            return;
                        };

                        let bitmap =
                            NSBitmapImageRep::initWithCGImage(NSBitmapImageRep::alloc(), &cgimage);

                        let Some(png_data) = bitmap.representationUsingType_properties(
                            NSBitmapImageFileType::PNG,
                            &objc2_foundation::NSDictionary::new(),
                        ) else {
                            let _ = tx.send(None);
                            return;
                        };

                        let len: usize = msg_send![&*png_data, length];
                        let ptr: *const u8 = msg_send![&*png_data, bytes];
                        let slice = std::slice::from_raw_parts(ptr, len);
                        let base64 = base64::engine::general_purpose::STANDARD.encode(slice);
                        let _ = tx.send(Some(base64));
                    }
                })
                .map_err(crate::Error::Tauri)?;

            rx.recv()
                .map_err(|e| crate::Error::Custom(format!("Failed to receive icon data: {}", e)))
        }

        #[cfg(not(target_os = "macos"))]
        {
            Ok(None)
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
