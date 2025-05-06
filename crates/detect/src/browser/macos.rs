use objc2::rc::Retained;
use tokio::time::{interval, Duration};

use super::MEETING_REGEXES;
use crate::BackgroundTask;

#[derive(Debug)]
pub enum SupportedBrowsers {
    Safari,
    Chrome,
    Firefox,
}

// defaults read /Applications/Safari.app/Contents/Info.plist CFBundleIdentifier
impl SupportedBrowsers {
    pub fn bundle_id(&self) -> &str {
        match self {
            SupportedBrowsers::Safari => "com.apple.Safari",
            SupportedBrowsers::Chrome => "com.google.Chrome",
            SupportedBrowsers::Firefox => "org.mozilla.firefox",
        }
    }

    pub fn from_bundle_id(bundle_id: &str) -> Option<Self> {
        match bundle_id {
            id if id == Self::Safari.bundle_id() => Some(Self::Safari),
            id if id == Self::Chrome.bundle_id() => Some(Self::Chrome),
            id if id == Self::Firefox.bundle_id() => Some(Self::Firefox),
            _ => None,
        }
    }

    pub fn extract_url(&self) -> Option<String> {
        match self {
            SupportedBrowsers::Safari => {
                let script =
                    "tell application \"Safari\" to get URL of current tab of front window";
                run_applescript(script)
            }
            SupportedBrowsers::Chrome => {
                let script =
                    "tell application \"Google Chrome\" to get URL of active tab of front window";
                run_applescript(script)
            }
            SupportedBrowsers::Firefox => {
                let script = r#"
                tell application "Firefox"
                    set currentURL to ""
                    try
                        set currentURL to URL of active tab of front window
                    end try
                    return currentURL
                end tell
                "#;
                run_applescript(script)
            }
        }
    }
}

#[derive(Default)]
pub struct Detector {
    background: BackgroundTask,
    detected_urls: std::collections::HashSet<String>,
}

impl crate::Observer for Detector {
    fn start(&mut self, f: crate::DetectCallback) {
        let mut detected_urls = self.detected_urls.clone();

        self.background.start(|running, mut rx| async move {
            let mut interval_timer = interval(Duration::from_secs(5));

            loop {
                tokio::select! {
                    _ = &mut rx => {
                        break;
                    }
                    _ = interval_timer.tick() => {
                        if !running.load(std::sync::atomic::Ordering::SeqCst) {
                            break;
                        }

                        let url = get_ns_url("http://google.com");
                        let ws = unsafe { objc2_app_kit::NSWorkspace::sharedWorkspace() };
                        let app_url = unsafe { ws.URLForApplicationToOpenURL(&url) }.unwrap();
                        let target_bundle_id = get_bundle_id_from_url(&app_url);

                        let apps = unsafe { ws.runningApplications() };
                        for app in apps.iter() {
                            if let Some(current_bundle_id) = unsafe { app.bundleIdentifier() } {
                                if current_bundle_id == target_bundle_id {
                                    let bundle_id_str = current_bundle_id.to_string();
                                    let browser_url = SupportedBrowsers::from_bundle_id(&bundle_id_str)
                                        .and_then(|browser| browser.extract_url());

                                    if let Some(url) = browser_url {
                                        if MEETING_REGEXES.iter().any(|re| re.is_match(&url)) {
                                            if !detected_urls.contains(&url) {
                                                let normalized_url = {
                                                    let mut u = url::Url::parse(&url).unwrap();
                                                    u.set_query(None);
                                                    u.to_string()
                                                };
                                                detected_urls.insert(normalized_url.clone());
                                                f(normalized_url);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    fn stop(&mut self) {
        self.background.stop();
        self.detected_urls.clear();
    }
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

fn run_applescript(script: &str) -> Option<String> {
    let output = std::process::Command::new("osascript")
        .args(["-e", script])
        .output()
        .ok()?;

    if output.status.success() {
        let url = String::from_utf8_lossy(&output.stdout).trim().to_string();

        if !url.is_empty() {
            return Some(url);
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect() {
        let browsers = vec![
            SupportedBrowsers::Safari,
            SupportedBrowsers::Chrome,
            SupportedBrowsers::Firefox,
        ];

        for browser in browsers {
            let url = browser.extract_url();
            println!("Browser: {:?}, URL: {:?}", browser, url);
        }
    }
}
