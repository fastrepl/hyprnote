use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

use anlg_deeplink_core::AuthCallbackSearch;
use anlg_desktop_auth::{AccountInfo, Persistence, SessionManager, paths, storage_key};

const AUTH_SCOPE: &str = "auth";
const AUTH_KEY: &str = "supabase-storage";
const SUPABASE_URL: Option<&str> = option_env!("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY: Option<&str> = option_env!("VITE_SUPABASE_ANON_KEY");

pub struct Auth {
    session: Arc<SessionManager>,
    callbacks: Mutex<CallbackDeduper>,
}

impl Auth {
    pub fn new(identifier: &str) -> Self {
        let key = SUPABASE_URL.map_or_else(|| "sb-auth-auth-token".to_string(), storage_key);
        let client = SUPABASE_URL
            .zip(SUPABASE_ANON_KEY)
            .map(|(url, anon_key)| anlg_supabase_auth::refresh::AuthClient::new(url, anon_key));
        let persistence = persistence(identifier);
        let session =
            SessionManager::new(key.clone(), persistence, client.clone()).unwrap_or_else(|error| {
                tracing::warn!(%error, "failed to load desktop auth persistence");
                SessionManager::in_memory(key, HashMap::new(), client)
            });
        Self {
            session: Arc::new(session),
            callbacks: Mutex::new(CallbackDeduper::default()),
        }
    }

    pub fn account_info(&self) -> Option<AccountInfo> {
        self.session.account_info().ok().flatten()
    }

    pub fn sign_out(&self) {
        self.session.sign_out();
    }

    pub async fn refresh(&self) {
        if let Err(error) = self.session.ensure_fresh(Duration::from_secs(60)).await {
            tracing::warn!(%error, "failed to refresh desktop auth session");
            if matches!(error, anlg_desktop_auth::Error::Refresh(error) if error.is_fatal()) {
                self.sign_out();
            }
        }
    }

    pub async fn handle_callback(&self, callback: AuthCallbackSearch) -> Result<(), String> {
        let fingerprint = format!("{}:{}", callback.access_token, callback.refresh_token);
        if !self
            .callbacks
            .lock()
            .unwrap()
            .begin(&fingerprint, SystemTime::now())
        {
            return Ok(());
        }
        let result = self
            .session
            .install_tokens(&callback.access_token, &callback.refresh_token)
            .await
            .map(|_| ())
            .map_err(|error| error.to_string());
        self.callbacks
            .lock()
            .unwrap()
            .finish(&fingerprint, SystemTime::now());
        result
    }
}

#[derive(Default)]
struct CallbackDeduper {
    recent: Option<(String, SystemTime)>,
    in_flight: Option<String>,
}

impl CallbackDeduper {
    fn begin(&mut self, fingerprint: &str, now: SystemTime) -> bool {
        if self.in_flight.as_deref() == Some(fingerprint) {
            return false;
        }
        if self.recent.as_ref().is_some_and(|(value, at)| {
            value == fingerprint
                && now.duration_since(*at).unwrap_or_default() < Duration::from_secs(5)
        }) {
            return false;
        }
        self.in_flight = Some(fingerprint.to_string());
        true
    }

    fn finish(&mut self, fingerprint: &str, now: SystemTime) {
        if self.in_flight.as_deref() == Some(fingerprint) {
            self.in_flight = None;
            self.recent = Some((fingerprint.to_string(), now));
        }
    }
}

struct FilePersistence {
    path: PathBuf,
}

impl Persistence for FilePersistence {
    fn load(&self) -> anlg_desktop_auth::Result<HashMap<String, String>> {
        match std::fs::read_to_string(&self.path) {
            Ok(content) => Ok(serde_json::from_str(&content).unwrap_or_default()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(HashMap::new()),
            Err(error) => Err(anlg_desktop_auth::Error::Persistence(error.to_string())),
        }
    }

    fn save(&self, data: &HashMap<String, String>) -> anlg_desktop_auth::Result<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| anlg_desktop_auth::Error::Persistence(error.to_string()))?;
        }
        let content = serde_json::to_string(data)?;
        anlg_storage::fs::atomic_write(&self.path, &content)
            .map_err(|error| anlg_desktop_auth::Error::Persistence(error.to_string()))
    }

    fn clear(&self) -> anlg_desktop_auth::Result<()> {
        if self.path.exists() {
            std::fs::remove_file(&self.path)
                .map_err(|error| anlg_desktop_auth::Error::Persistence(error.to_string()))?;
        }
        Ok(())
    }
}

#[cfg(target_os = "linux")]
struct SecretPersistence {
    app_id: String,
    fallback: FilePersistence,
}

#[cfg(target_os = "windows")]
struct WindowsPersistence {
    secure_path: PathBuf,
    fallback: FilePersistence,
}

#[cfg(target_os = "windows")]
impl Persistence for WindowsPersistence {
    fn load(&self) -> anlg_desktop_auth::Result<HashMap<String, String>> {
        if self.secure_path.is_file() {
            return anlg_storage::windows_auth::load(&self.secure_path)
                .map_err(|error| anlg_desktop_auth::Error::Persistence(error.to_string()));
        }
        self.fallback.load()
    }

    fn save(&self, data: &HashMap<String, String>) -> anlg_desktop_auth::Result<()> {
        match anlg_storage::windows_auth::persist(&self.secure_path, data) {
            Ok(()) => self.fallback.clear(),
            Err(_) => self.fallback.save(data),
        }
    }

    fn clear(&self) -> anlg_desktop_auth::Result<()> {
        let secure = anlg_storage::windows_auth::clear(&self.secure_path);
        let fallback = self.fallback.clear();
        match (secure, fallback) {
            (Err(error), _) => Err(anlg_desktop_auth::Error::Persistence(error.to_string())),
            (Ok(()), Err(error)) => Err(error),
            (Ok(()), Ok(())) => Ok(()),
        }
    }
}

#[cfg(target_os = "linux")]
impl Persistence for SecretPersistence {
    fn load(&self) -> anlg_desktop_auth::Result<HashMap<String, String>> {
        match crate::secrets::read(&self.app_id, AUTH_SCOPE, AUTH_KEY) {
            Ok(Some(value)) => Ok(serde_json::from_str(&value).unwrap_or_default()),
            Ok(None) | Err(_) => self.fallback.load(),
        }
    }

    fn save(&self, data: &HashMap<String, String>) -> anlg_desktop_auth::Result<()> {
        let value = serde_json::to_string(data)?;
        if crate::secrets::write(&self.app_id, AUTH_SCOPE, AUTH_KEY, &value).is_err() {
            self.fallback.save(data)
        } else {
            Ok(())
        }
    }

    fn clear(&self) -> anlg_desktop_auth::Result<()> {
        let secure_result = crate::secrets::delete(&self.app_id, AUTH_SCOPE, AUTH_KEY);
        let fallback_result = self.fallback.clear().map_err(|error| error.to_string());
        match (secure_result, fallback_result) {
            (Err(error), _) => Err(anlg_desktop_auth::Error::Persistence(error)),
            (Ok(()), Err(error)) => Err(anlg_desktop_auth::Error::Persistence(error)),
            (Ok(()), Ok(())) => Ok(()),
        }
    }
}

fn persistence(identifier: &str) -> Box<dyn Persistence> {
    let new_base = anlg_storage::global::compute_default_base(identifier).unwrap_or_else(|| {
        dirs::data_dir()
            .unwrap_or_else(|| Path::new(".").to_path_buf())
            .join(identifier)
    });
    let data_dir = dirs::data_dir().unwrap_or_else(|| Path::new(".").to_path_buf());
    let new_path = new_base.join(paths::FILENAME);
    let legacy_path = data_dir.join("anarlog").join(paths::FILENAME);
    let path = paths::resolve_auth_path_from_paths(&legacy_path, &legacy_path, &new_path);
    #[cfg(target_os = "linux")]
    {
        let _ = path;
        Box::new(SecretPersistence {
            app_id: identifier.to_string(),
            fallback: FilePersistence { path },
        })
    }
    #[cfg(not(target_os = "linux"))]
    {
        #[cfg(target_os = "windows")]
        {
            return Box::new(WindowsPersistence {
                secure_path: anlg_storage::windows_auth::secure_path(&path),
                fallback: FilePersistence { path },
            });
        }
        #[cfg(not(target_os = "windows"))]
        {
            Box::new(FilePersistence { path })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dedupes_for_five_seconds() {
        let mut deduper = CallbackDeduper::default();
        let now = SystemTime::UNIX_EPOCH;
        assert!(deduper.begin("token", now));
        assert!(!deduper.begin("token", now + Duration::from_secs(1)));
        deduper.finish("token", now);
        assert!(!deduper.begin("token", now + Duration::from_secs(4)));
        assert!(deduper.begin("token", now + Duration::from_secs(5)));
    }
}
