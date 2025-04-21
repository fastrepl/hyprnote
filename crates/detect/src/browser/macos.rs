use objc2::rc::Retained;

#[derive(Default)]
pub struct Detector {}

impl crate::Observer for Detector {
    fn start(&mut self, _f: crate::DetectCallback) {
        let url = get_ns_url("http://google.com");

        let ws = unsafe { objc2_app_kit::NSWorkspace::sharedWorkspace() };
        let app_url = unsafe { ws.URLForApplicationToOpenURL(&url) }.unwrap();
        let target_bundle_id = get_bundle_id_from_url(&app_url);

        let apps = unsafe { ws.runningApplications() };
        for app in apps.iter() {
            if let Some(current_bundle_id) = unsafe { app.bundleIdentifier() } {
                if current_bundle_id == target_bundle_id {
                    println!("found: {}", current_bundle_id);
                }
            }
        }

        // let a = unsafe { objc2_application_services::AXUIElement::new_application(pid) };
    }
    fn stop(&mut self) {}
}

fn get_ns_url(url: impl AsRef<str>) -> Retained<objc2_foundation::NSURL> {
    let ns_url = objc2_foundation::NSString::from_str(url.as_ref());
    unsafe { objc2_foundation::NSURL::URLWithString(&ns_url) }.unwrap()
}

fn get_bundle_id_from_url(url: &objc2_foundation::NSURL) -> Retained<objc2_foundation::NSString> {
    let ws = unsafe { objc2_app_kit::NSWorkspace::sharedWorkspace() };
    let app_url = unsafe { ws.URLForApplicationToOpenURL(url) }.unwrap();
    let bundle = unsafe { objc2_foundation::NSBundle::bundleWithURL(&app_url) }.unwrap();
    unsafe { bundle.bundleIdentifier() }.unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Observer;

    #[test]
    fn test_detect() {
        let mut detector = Detector::default();
        detector.start(std::sync::Arc::new(|_| {}));
    }
}
