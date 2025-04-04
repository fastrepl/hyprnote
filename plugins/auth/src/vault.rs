use std::sync::{Arc, Mutex};

#[derive(Debug, Clone)]
pub struct Vault {
    entry: Arc<Mutex<Option<keyring::Entry>>>,
}

impl Default for Vault {
    fn default() -> Self {
        Self {
            entry: Arc::new(Mutex::new(None)),
        }
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, strum::AsRefStr, specta::Type)]
pub enum VaultKey {
    #[strum(serialize = "remote-database")]
    #[serde(rename = "remote-database")]
    #[specta(rename = "remote-database")]
    RemoteDatabase,
    #[strum(serialize = "remote-server")]
    #[serde(rename = "remote-server")]
    #[specta(rename = "remote-server")]
    RemoteServer,
    #[strum(serialize = "twenty-api-key")]
    #[serde(rename = "twenty-api-key")]
    #[specta(rename = "twenty-api-key")]
    TwentyApiKey,
}

#[derive(Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct VaultData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote_database: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote_server: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub twenty_api_key: Option<String>,
}

impl VaultData {
    pub fn get(&self, key: VaultKey) -> Option<String> {
        match key {
            VaultKey::RemoteDatabase => self.remote_database.clone(),
            VaultKey::RemoteServer => self.remote_server.clone(),
            VaultKey::TwentyApiKey => self.twenty_api_key.clone(),
        }
    }

    pub fn set(&mut self, key: VaultKey, value: impl Into<String>) {
        match key {
            VaultKey::RemoteDatabase => self.remote_database = Some(value.into()),
            VaultKey::RemoteServer => self.remote_server = Some(value.into()),
            VaultKey::TwentyApiKey => self.twenty_api_key = Some(value.into()),
        }
    }
}

impl Vault {
    pub fn init(&self, user_id: impl AsRef<str>) -> Result<(), crate::Error> {
        let entry = keyring::Entry::new("hyprnote", user_id.as_ref()).unwrap();
        self.entry.lock().unwrap().replace(entry);
        Ok(())
    }

    pub fn get(&self, key: VaultKey) -> Result<Option<String>, crate::Error> {
        let guard = self.entry.lock().unwrap();
        let entry = guard.as_ref().ok_or(crate::Error::VaultNotInitialized)?;

        let v: VaultData = match entry.get_password() {
            Ok(v) => Ok::<_, crate::Error>(serde_json::from_str(&v).unwrap_or_default()),
            Err(keyring::Error::NoEntry) => Ok::<_, crate::Error>(Default::default()),
            Err(e) => Err(e.into()),
        }?;

        Ok(v.get(key))
    }

    pub fn set(&self, key: VaultKey, value: impl Into<String>) -> Result<(), crate::Error> {
        let guard = self.entry.lock().unwrap();
        let entry = guard.as_ref().ok_or(crate::Error::VaultNotInitialized)?;

        let mut v: VaultData = match entry.get_password() {
            Ok(v) => Ok::<_, crate::Error>(serde_json::from_str(&v).unwrap_or_default()),
            Err(keyring::Error::NoEntry) => Ok::<_, crate::Error>(Default::default()),
            Err(e) => Err(e.into()),
        }?;
        v.set(key, value);

        entry
            .set_password(&serde_json::to_string(&v).unwrap())
            .map_err(Into::into)
    }

    pub fn clear(&self) -> Result<(), crate::Error> {
        let guard = self.entry.lock().unwrap();
        let entry = guard.as_ref().ok_or(crate::Error::VaultNotInitialized)?;

        match entry.delete_credential() {
            Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.into()),
        }
    }
}
