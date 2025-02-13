#[derive(Debug, Clone)]
pub struct Vault {
    service: String,
}

#[derive(Debug, strum::AsRefStr)]
pub enum Key {
    #[strum(serialize = "remote_database")]
    RemoteDatabase,
    #[strum(serialize = "remote_server")]
    RemoteServer,
}

impl Vault {
    pub fn new() -> Self {
        Self {
            service: "com.hyprnote.desktop".to_string(),
        }
    }

    pub fn get(&self, key: Key) -> Result<String, keyring::Error> {
        let entry = keyring::Entry::new(&self.service, key.as_ref()).unwrap();
        entry.get_password()
    }

    pub fn set(&self, key: Key, value: impl AsRef<str>) -> Result<(), keyring::Error> {
        let entry = keyring::Entry::new(&self.service, key.as_ref()).unwrap();
        entry.set_password(value.as_ref())
    }
}
