#[derive(Debug, Clone)]
pub struct Vault {
    service: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, strum::AsRefStr, specta::Type)]
pub enum Key {
    #[strum(serialize = "userId")]
    #[serde(rename = "userId")]
    #[specta(rename = "userId")]
    UserId,
    #[strum(serialize = "accountId")]
    #[serde(rename = "accountId")]
    #[specta(rename = "accountId")]
    AccountId,
    #[strum(serialize = "remoteDatabase")]
    #[serde(rename = "remoteDatabase")]
    #[specta(rename = "remoteDatabase")]
    RemoteDatabase,
    #[strum(serialize = "remoteServer")]
    #[serde(rename = "remoteServer")]
    #[specta(rename = "remoteServer")]
    RemoteServer,
}

impl Vault {
    pub fn new(service: impl Into<String>) -> Self {
        Self {
            service: service.into(),
        }
    }

    pub fn get(&self, key: Key) -> Result<Option<String>, keyring::Error> {
        let entry = keyring::Entry::new(&self.service, key.as_ref()).unwrap();
        match entry.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set(&self, key: Key, value: impl AsRef<str>) -> Result<(), keyring::Error> {
        let entry = keyring::Entry::new(&self.service, key.as_ref()).unwrap();
        entry.set_password(value.as_ref())
    }

    pub fn clear(&self) -> Result<(), keyring::Error> {
        let keys = [
            Key::UserId,
            Key::AccountId,
            Key::RemoteDatabase,
            Key::RemoteServer,
        ];

        for key in keys {
            let entry = keyring::Entry::new(&self.service, key.as_ref()).unwrap();
            entry.delete_credential()?;
        }

        Ok(())
    }
}
