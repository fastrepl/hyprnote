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
}

impl Vault {
    pub fn init(&self, account_id: impl AsRef<str>) -> Result<(), crate::Error> {
        let entry = keyring::Entry::new("hyprnote", account_id.as_ref()).unwrap();
        self.entry.lock().unwrap().replace(entry);
        Ok(())
    }

    pub fn get(&self, _key: VaultKey) -> Result<Option<String>, crate::Error> {
        let guard = self.entry.lock().unwrap();
        let entry = guard.as_ref().ok_or(crate::Error::VaultNotInitialized)?;

        match entry.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn set(&self, _key: VaultKey, value: impl AsRef<str>) -> Result<(), crate::Error> {
        let guard = self.entry.lock().unwrap();
        let entry = guard.as_ref().ok_or(crate::Error::VaultNotInitialized)?;

        entry.set_password(value.as_ref()).map_err(Into::into)
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
