#[cfg(target_os = "macos")]
mod recording_indicator_state {
    use std::sync::Mutex;

    static ORIGINAL_ICON_DATA: Mutex<Option<Vec<u8>>> = Mutex::new(None);
    static IS_ACTIVE: Mutex<bool> = Mutex::new(false);

    pub fn get() -> Option<Vec<u8>> {
        ORIGINAL_ICON_DATA.lock().unwrap().clone()
    }

    pub fn set(data: Option<Vec<u8>>) {
        *ORIGINAL_ICON_DATA.lock().unwrap() = data;
    }

    pub fn clear() {
        *ORIGINAL_ICON_DATA.lock().unwrap() = None;
    }

    pub fn is_active() -> bool {
        *IS_ACTIVE.lock().unwrap()
    }

    pub fn set_active(active: bool) {
        *IS_ACTIVE.lock().unwrap() = active;
    }
}

#[cfg(target_os = "macos")]
mod icon_helpers {
    use objc2::AnyThread;
    use objc2::rc::Retained;
    use objc2_app_kit::{NSBezierPath, NSColor, NSImage};
    use objc2_foundation::{NSPoint, NSRect, NSSize};

    pub fn image_to_bytes(image: &NSImage) -> Option<Vec<u8>> {
        let tiff_data = image.TIFFRepresentation()?;
        let len = tiff_data.length();
        if len == 0 {
            return None;
        }
        let mut bytes = vec![0u8; len];
        unsafe {
            tiff_data.getBytes_length(
                std::ptr::NonNull::new(bytes.as_mut_ptr() as *mut std::ffi::c_void).unwrap(),
                len,
            );
        }
        Some(bytes)
    }

    #[allow(deprecated)]
    pub fn draw_overlay(base_image: &NSImage) -> Retained<NSImage> {
        let size = base_image.size();
        let composite_image = NSImage::initWithSize(NSImage::alloc(), size);

        composite_image.lockFocus();

        base_image.drawAtPoint_fromRect_operation_fraction(
            NSPoint::new(0.0, 0.0),
            NSRect::new(NSPoint::new(0.0, 0.0), size),
            objc2_app_kit::NSCompositingOperation::Copy,
            1.0,
        );

        let dot_size = size.width * 0.33;
        let border_width = dot_size * 0.08;
        let dot_x = size.width - dot_size - (size.width * 0.02);
        let dot_y = size.height * 0.02;

        let white_color = NSColor::whiteColor();
        white_color.setFill();

        let outer_rect = NSRect::new(NSPoint::new(dot_x, dot_y), NSSize::new(dot_size, dot_size));
        let outer_path = NSBezierPath::bezierPathWithOvalInRect(outer_rect);
        outer_path.fill();

        let red_color = NSColor::systemRedColor();
        red_color.setFill();

        let red_size = dot_size - (border_width * 2.0);
        let red_x = dot_x + border_width;
        let red_y = dot_y + border_width;
        let red_rect = NSRect::new(NSPoint::new(red_x, red_y), NSSize::new(red_size, red_size));
        let red_path = NSBezierPath::bezierPathWithOvalInRect(red_rect);
        red_path.fill();

        let center_size = red_size * 0.45;
        let center_x = red_x + (red_size - center_size) / 2.0;
        let center_y = red_y + (red_size - center_size) / 2.0;

        white_color.setFill();
        let center_rect = NSRect::new(
            NSPoint::new(center_x, center_y),
            NSSize::new(center_size, center_size),
        );
        let center_path = NSBezierPath::bezierPathWithOvalInRect(center_rect);
        center_path.fill();

        composite_image.unlockFocus();

        composite_image
    }
}

pub struct Icon<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    #[allow(dead_code)]
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

                    let mtm =
                        MainThreadMarker::new().expect("run_on_main_thread guarantees main thread");
                    let ns_app = NSApplication::sharedApplication(mtm);

                    let path_str = NSString::from_str(&icon_path_str);
                    let Some(image) = NSImage::initWithContentsOfFile(NSImage::alloc(), &path_str)
                    else {
                        return;
                    };

                    if recording_indicator_state::is_active() {
                        let Some(bytes) = icon_helpers::image_to_bytes(&image) else {
                            return;
                        };
                        recording_indicator_state::set(Some(bytes));

                        let composite_image = icon_helpers::draw_overlay(&image);
                        unsafe { ns_app.setApplicationIconImage(Some(&composite_image)) };
                    } else {
                        recording_indicator_state::clear();
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

                    recording_indicator_state::clear();
                    unsafe { ns_app.setApplicationIconImage(None) };

                    if recording_indicator_state::is_active() {
                        let Some(current) = ns_app.applicationIconImage() else {
                            return;
                        };

                        let composite_image = icon_helpers::draw_overlay(&current);
                        unsafe { ns_app.setApplicationIconImage(Some(&composite_image)) };
                    }
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
                    use objc2_app_kit::{NSApplication, NSImage};
                    use objc2_foundation::{MainThreadMarker, NSData};

                    let mtm =
                        MainThreadMarker::new().expect("run_on_main_thread guarantees main thread");
                    let ns_app = NSApplication::sharedApplication(mtm);

                    if !show {
                        recording_indicator_state::set_active(false);
                        if let Some(original_data) = recording_indicator_state::get() {
                            let ns_data = NSData::with_bytes(&original_data);
                            let original_image = NSImage::initWithData(NSImage::alloc(), &ns_data);
                            if let Some(original_image) = original_image {
                                unsafe { ns_app.setApplicationIconImage(Some(&original_image)) };
                            }
                        } else {
                            unsafe { ns_app.setApplicationIconImage(None) };
                        }
                        recording_indicator_state::clear();
                        return;
                    }

                    let base_image = if let Some(original_data) = recording_indicator_state::get() {
                        let ns_data = NSData::with_bytes(&original_data);
                        let original_image = NSImage::initWithData(NSImage::alloc(), &ns_data);
                        match original_image {
                            Some(img) => img,
                            None => return,
                        }
                    } else {
                        if recording_indicator_state::is_active() {
                            return;
                        }

                        let Some(current) = ns_app.applicationIconImage() else {
                            return;
                        };

                        let Some(bytes) = icon_helpers::image_to_bytes(&current) else {
                            return;
                        };
                        recording_indicator_state::set(Some(bytes));

                        current
                    };

                    recording_indicator_state::set_active(true);

                    let composite_image = icon_helpers::draw_overlay(&base_image);
                    unsafe { ns_app.setApplicationIconImage(Some(&composite_image)) };
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
