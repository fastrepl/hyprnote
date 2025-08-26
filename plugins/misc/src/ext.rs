use tauri::{Manager, Runtime};

pub trait MiscPluginExt<R: Runtime> {
    fn get_git_hash(&self) -> String;
    fn get_fingerprint(&self) -> String;
    fn opinionated_md_to_html(&self, text: impl AsRef<str>) -> Result<String, String>;
    fn parse_meeting_link(&self, text: impl AsRef<str>) -> Option<String>;
}

impl<R: Runtime, T: Manager<R>> MiscPluginExt<R> for T {
    fn get_git_hash(&self) -> String {
        env!("VERGEN_GIT_SHA").to_string()
    }

    fn get_fingerprint(&self) -> String {
        hypr_host::fingerprint()
    }

    fn opinionated_md_to_html(&self, text: impl AsRef<str>) -> Result<String, String> {
        hypr_buffer::opinionated_md_to_html(text.as_ref()).map_err(|e| e.to_string())
    }

    fn parse_meeting_link(&self, text: impl AsRef<str>) -> Option<String> {
        let text = text.as_ref();

        for regex in MEETING_REGEXES.iter() {
            if let Some(capture) = regex.find(text) {
                return Some(capture.as_str().to_string());
            }
        }

        let url_pattern = r"https?://[^\s]+";
        if let Ok(regex) = regex::Regex::new(url_pattern) {
            if let Some(capture) = regex.find(text) {
                return Some(capture.as_str().to_string());
            }
        }

        None
    }
}

lazy_static::lazy_static! {
    pub static ref MEETING_REGEXES: Vec<regex::Regex> = vec![
        regex::Regex::new(r"https://meet\.google\.com/[a-z0-9]{3,4}-[a-z0-9]{3,4}-[a-z0-9]{3,4}").unwrap(),
        regex::Regex::new(r"https://[a-z0-9.-]+\.zoom\.us/j/\d+(\?pwd=[a-zA-Z0-9.]+)?").unwrap(),
        regex::Regex::new(r"https://app\.cal\.com/video/[a-zA-Z0-9]+").unwrap(),
    ];
}
